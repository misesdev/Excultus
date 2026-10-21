import type {
  Clock,
  EventBus,
  FileStorage,
  IdGenerator,
  Logger,
  NetworkMonitor,
  NetworkStatus,
} from '@core/application';
import { toAppError } from '@core/errors';
import type { Unsubscribe } from '@core/types';
import {
  canPause,
  canResume,
  canRetry,
  isActiveStatus,
  isRetryableError,
  retryDelayMs,
  transition,
  type Download,
  type DownloadErrorCode,
  type DownloadStatus,
} from '../domain/entities/Download';
import {
  aggregateProgress,
  checkIntegrity,
  hasEnoughSpace,
  remainingBytes,
  selectDownloadsToStart,
  type AggregateProgress,
} from '../domain/policies/downloadPolicies';
import type { DownloadRepository } from '../domain/repositories/DownloadRepository';
import type {
  DownloadedFileProcessor,
  DownloadRuntimeConfig,
  FileDownloader,
  FileDownloaderEvent,
  FileDownloadFailureReason,
  MediaUrlResolver,
  ResolvedMediaUrl,
} from './ports';

export interface DownloadRequest {
  audioId: string;
  url: string;
  fileExtension: string;
  expectedBytes?: number;
  expectedMd5?: string;
}

export interface LocalFileRegistration {
  audioId: string;
  /** App-owned copy produced by the document picker; it will be moved. */
  sourcePath: string;
  fileExtension: string;
  sourceUri: string;
}

export interface ActiveDownloadState {
  downloadId: string;
  audioId: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes?: number;
  errorCode?: DownloadErrorCode;
}

export interface DownloadSnapshot {
  byAudioId: Readonly<Record<string, ActiveDownloadState>>;
  aggregate: AggregateProgress;
  waitingForNetwork: boolean;
}

export interface DownloadManagerDeps {
  repository: DownloadRepository;
  downloader: FileDownloader;
  storage: FileStorage;
  network: NetworkMonitor;
  events: EventBus;
  clock: Clock;
  generateId: IdGenerator;
  logger: Logger;
  getConfig: () => DownloadRuntimeConfig;
  /** Defaults to using the stored URL as is. */
  urlResolver?: MediaUrlResolver;
  fileProcessor?: DownloadedFileProcessor;
}

const PROGRESS_PERSIST_INTERVAL_MS = 5000;

const FAILURE_CODES: Record<
  Exclude<FileDownloadFailureReason, 'cancelled'>,
  DownloadErrorCode
> = {
  network: 'network',
  http: 'http',
  storage: 'insufficient-storage',
  io: 'io',
};

/**
 * Orchestrates the persistent download queue.
 *
 * - SQLite is the source of truth; `active` mirrors non-terminal records.
 * - Every state mutation runs through `serial()` so user commands and native
 *   events never interleave (no double starts, no lost transitions).
 * - Files are written to a temp path and moved only after validation.
 * - On startup, records left "downloading" by a killed process are re-queued
 *   and resume from their partial file.
 */
export class DownloadManager {
  private readonly active = new Map<string, Download>();
  private readonly running = new Set<string>();
  private readonly lastPersist = new Map<string, number>();
  private readonly retryAfter = new Map<string, number>();
  private readonly retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly listeners = new Set<(snapshot: DownloadSnapshot) => void>();
  private readonly subscriptions: Unsubscribe[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private started = false;
  private waitingForNetwork = false;
  private snapshot: DownloadSnapshot = {
    byAudioId: {},
    aggregate: aggregateProgress([]),
    waitingForNetwork: false,
  };

  constructor(private readonly deps: DownloadManagerDeps) {}

  // ---------------------------------------------------------------- lifecycle

  start(): Promise<void> {
    if (this.started) {
      return Promise.resolve();
    }
    this.started = true;
    this.subscriptions.push(
      this.deps.downloader.subscribe(event => this.onDownloaderEvent(event)),
      this.deps.network.subscribe(status => {
        this.background(() => this.onNetworkChange(status));
      }),
    );
    return this.serial(async () => {
      const records = await this.deps.repository.findByStatus([
        'queued',
        'downloading',
        'paused',
        'failed',
      ]);
      const now = this.deps.clock.nowIso();
      for (const record of records) {
        let download = record;
        if (record.status === 'downloading') {
          // The process died mid-download; resume from the partial file.
          const partial = (await this.deps.storage.fileSize(record.tempPath)) ?? 0;
          download = transition(record, 'queued', now, { bytesDownloaded: partial });
          await this.deps.repository.save(download);
        }
        this.active.set(download.audioId, download);
      }
      this.deps.logger.info('downloads.recovered', { count: records.length });
      await this.schedule();
    });
  }

  stop(): void {
    this.subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    this.started = false;
  }

  // ---------------------------------------------------------------- queries

  getSnapshot(): DownloadSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: DownloadSnapshot) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  // ---------------------------------------------------------------- commands

  /** Adds downloads to the queue. Returns how many were actually enqueued. */
  enqueue(requests: readonly DownloadRequest[]): Promise<number> {
    return this.serial(async () => {
      let enqueued = 0;
      const now = this.deps.clock.nowIso();
      for (const request of requests) {
        const existing = await this.deps.repository.findByAudioId(request.audioId);
        const next = await this.prepareQueuedRecord(existing, request, now);
        if (next) {
          await this.deps.repository.save(next);
          this.active.set(next.audioId, next);
          enqueued++;
        }
      }
      if (enqueued > 0) {
        this.deps.logger.info('downloads.enqueued', { count: enqueued });
        this.deps.events.emit('downloads', 'library');
      }
      await this.schedule();
      return enqueued;
    });
  }

  pause(audioId: string): Promise<void> {
    return this.serial(async () => {
      const download = this.active.get(audioId);
      if (!download || !canPause(download.status)) {
        return;
      }
      const partial = await this.stopRunning(download);
      await this.commit(
        transition(download, 'paused', this.deps.clock.nowIso(), {
          bytesDownloaded: partial ?? download.bytesDownloaded,
          totalBytes: download.totalBytes,
        }),
      );
      await this.schedule();
    });
  }

  resume(audioId: string): Promise<void> {
    return this.serial(async () => {
      const download = this.active.get(audioId);
      if (!download || !canResume(download.status)) {
        return;
      }
      await this.commit(
        transition(download, 'queued', this.deps.clock.nowIso(), {
          bytesDownloaded: download.bytesDownloaded,
          totalBytes: download.totalBytes,
        }),
      );
      await this.schedule();
    });
  }

  pauseAll(): Promise<void> {
    return this.serialForEach(
      download => canPause(download.status),
      id => this.pause(id),
    );
  }

  resumeAll(): Promise<void> {
    return this.serialForEach(
      download => canResume(download.status),
      id => this.resume(id),
    );
  }

  cancel(audioId: string): Promise<void> {
    return this.serial(async () => {
      const download = this.active.get(audioId);
      if (!download) {
        return;
      }
      await this.stopRunning(download);
      await this.deps.storage.remove(download.tempPath);
      const cancelled = transition(download, 'cancelled', this.deps.clock.nowIso(), {
        bytesDownloaded: 0,
        totalBytes: download.totalBytes,
      });
      await this.deps.repository.save(cancelled);
      this.forget(download);
      this.deps.events.emit('downloads', 'library');
      this.publish();
      await this.schedule();
    });
  }

  retry(audioId: string): Promise<void> {
    return this.serial(async () => {
      const download =
        this.active.get(audioId) ?? (await this.deps.repository.findByAudioId(audioId));
      if (!download || !canRetry(download.status)) {
        return;
      }
      await this.commit(
        transition(download, 'queued', this.deps.clock.nowIso(), {
          attempts: 0,
          bytesDownloaded: (await this.deps.storage.fileSize(download.tempPath)) ?? 0,
          totalBytes: download.totalBytes,
        }),
      );
      this.deps.events.emit('downloads', 'library');
      await this.schedule();
    });
  }

  retryAllFailed(): Promise<void> {
    return this.serialForEach(
      download => download.status === 'failed',
      id => this.retry(id),
    );
  }

  /** Deletes the local (final or partial) file and the download record; metadata is kept. */
  deleteDownloadedFile(audioId: string): Promise<void> {
    return this.serial(async () => {
      const download = await this.deps.repository.findByAudioId(audioId);
      if (!download) {
        return;
      }
      await this.stopRunning(download);
      await this.deps.storage.remove(download.tempPath);
      if (download.localPath) {
        await this.deps.storage.remove(download.localPath);
      }
      await this.deps.repository.delete(download.id);
      this.forget(download);
      this.deps.logger.info('downloads.file_deleted', { audioId });
      this.deps.events.emit('downloads', 'library', 'collections');
      this.publish();
      await this.schedule();
    });
  }

  /** AudioFileCleaner implementation used when an audio leaves the library. */
  removeFilesFor(audioId: string): Promise<void> {
    return this.deleteDownloadedFile(audioId);
  }

  /** Registers an imported device file as an already-completed, verified download. */
  registerLocalFile(registration: LocalFileRegistration): Promise<void> {
    return this.serial(async () => {
      const existing = await this.deps.repository.findByAudioId(registration.audioId);
      if (existing?.status === 'completed' && existing.localPath) {
        if (await this.deps.storage.exists(existing.localPath)) {
          await this.deps.storage.remove(registration.sourcePath);
          return;
        }
      }
      const id = existing?.id ?? this.deps.generateId();
      const target = this.deps.storage.audioFilePath(
        registration.audioId,
        registration.fileExtension,
      );
      await this.deps.storage.move(registration.sourcePath, target);
      const size = (await this.deps.storage.fileSize(target)) ?? 0;
      const now = this.deps.clock.nowIso();
      await this.deps.repository.save({
        id,
        audioId: registration.audioId,
        url: registration.sourceUri,
        status: 'completed',
        bytesDownloaded: size,
        totalBytes: size,
        fileExtension: registration.fileExtension,
        tempPath: this.deps.storage.tempFilePath(id),
        localPath: target,
        attempts: 0,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        completedAt: now,
        verifiedAt: now,
      });
      this.active.delete(registration.audioId);
      this.deps.events.emit('downloads', 'library');
      this.publish();
    });
  }

  /** Re-evaluates the queue, e.g. after settings changed. */
  reschedule(): Promise<void> {
    return this.serial(() => this.schedule());
  }

  /** Temp files still needed to resume active downloads. */
  activeTempPaths(): Set<string> {
    return new Set([...this.active.values()].map(download => download.tempPath));
  }

  // ---------------------------------------------------------------- internals

  private async prepareQueuedRecord(
    existing: Download | null,
    request: DownloadRequest,
    now: string,
  ): Promise<Download | null> {
    if (existing && isActiveStatus(existing.status)) {
      return null; // Already queued, running or paused: avoid duplicates.
    }
    if (existing?.status === 'completed') {
      const present =
        existing.localPath && (await this.deps.storage.exists(existing.localPath));
      if (present) {
        return null; // Already offline.
      }
    }
    const id = existing?.id ?? this.deps.generateId();
    const tempPath = this.deps.storage.tempFilePath(id);
    const partial = (await this.deps.storage.fileSize(tempPath)) ?? 0;
    return {
      id,
      audioId: request.audioId,
      url: request.url,
      status: 'queued',
      bytesDownloaded: partial,
      totalBytes: request.expectedBytes,
      expectedMd5: request.expectedMd5,
      fileExtension: request.fileExtension,
      tempPath,
      attempts: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  }

  private async schedule(): Promise<void> {
    if (!this.started) {
      return;
    }
    const config = this.deps.getConfig();
    const network = await this.deps.network.getStatus();
    const offline = !network.isConnected || (config.wifiOnly && !network.isWifi);
    const hasQueued = [...this.active.values()].some(
      download => download.status === 'queued',
    );
    this.waitingForNetwork = offline && hasQueued;
    if (offline) {
      this.publish();
      return;
    }
    const nowMs = this.deps.clock.nowMs();
    const eligible = [...this.active.values()].filter(
      download => (this.retryAfter.get(download.id) ?? 0) <= nowMs,
    );
    for (const download of selectDownloadsToStart(eligible, config.maxConcurrent)) {
      await this.startDownload(download);
    }
    this.publish();
  }

  private async startDownload(download: Download): Promise<void> {
    const now = this.deps.clock.nowIso();
    const free = await this.deps.storage.freeSpaceBytes();
    if (!hasEnoughSpace(free, remainingBytes(download))) {
      this.deps.logger.warn('downloads.insufficient_storage', {
        audioId: download.audioId,
        free,
      });
      await this.commit(
        transition(download, 'failed', now, {
          errorCode: 'insufficient-storage',
          errorMessage: 'Not enough free storage',
        }),
      );
      return;
    }
    let partial = (await this.deps.storage.fileSize(download.tempPath)) ?? 0;
    const running = transition(download, 'downloading', now, {
      bytesDownloaded: partial,
      totalBytes: download.totalBytes,
      attempts: download.attempts,
    });
    await this.commit(running);

    let source: ResolvedMediaUrl;
    try {
      source = this.deps.urlResolver
        ? await this.deps.urlResolver.resolve(running.url)
        : { url: running.url };
    } catch (error) {
      const appError = toAppError(error);
      await this.handleFailure(
        running,
        appError.code === 'network' ? 'network' : 'source-unavailable',
        undefined,
        appError.message,
      );
      return;
    }
    let current = running;
    if (source.totalBytes !== undefined && source.totalBytes !== running.totalBytes) {
      if (partial > 0) {
        // A different file than the partial one: appending would corrupt it.
        await this.deps.storage.remove(running.tempPath);
        partial = 0;
      }
      current = { ...running, bytesDownloaded: partial, totalBytes: source.totalBytes };
      await this.commit(current);
    }

    this.running.add(current.id);
    this.retryAfter.delete(current.id);
    try {
      await this.deps.downloader.start({
        taskId: current.id,
        url: source.url,
        destinationPath: current.tempPath,
      });
    } catch (error) {
      this.running.delete(current.id);
      await this.handleFailure(current, 'io', undefined, String(error));
    }
  }

  private onDownloaderEvent(event: FileDownloaderEvent): void {
    if (event.type === 'progress') {
      this.onProgress(event.taskId, event.bytesWritten, event.totalBytes);
      return;
    }
    this.background(async () => {
      const download = this.findActiveById(event.taskId);
      if (!download || !this.running.has(download.id)) {
        return; // Stale event from a task we already stopped.
      }
      this.running.delete(download.id);
      if (event.type === 'completed') {
        await this.finalize(download, event.totalBytes);
      } else if (event.reason !== 'cancelled') {
        await this.handleFailure(
          download,
          FAILURE_CODES[event.reason],
          event.httpStatus,
          event.message,
        );
      }
      await this.schedule();
    });
  }

  private onProgress(taskId: string, bytesWritten: number, totalBytes?: number): void {
    const download = this.findActiveById(taskId);
    if (!download || download.status !== 'downloading') {
      return;
    }
    const updated: Download = {
      ...download,
      bytesDownloaded: bytesWritten,
      totalBytes: download.totalBytes ?? totalBytes,
    };
    this.active.set(download.audioId, updated);
    this.publish();
    const nowMs = this.deps.clock.nowMs();
    if (nowMs - (this.lastPersist.get(taskId) ?? 0) >= PROGRESS_PERSIST_INTERVAL_MS) {
      this.lastPersist.set(taskId, nowMs);
      this.deps.repository
        .updateProgress(
          taskId,
          bytesWritten,
          updated.totalBytes,
          this.deps.clock.nowIso(),
        )
        .catch(error =>
          this.deps.logger.warn('downloads.progress_persist_failed', { taskId }, error),
        );
    }
  }

  private async finalize(download: Download, reportedTotal?: number): Promise<void> {
    const now = this.deps.clock.nowIso();
    const actualBytes = (await this.deps.storage.fileSize(download.tempPath)) ?? 0;
    const actualMd5 = download.expectedMd5
      ? await this.deps.storage.md5(download.tempPath)
      : undefined;
    const integrity = checkIntegrity({
      actualBytes,
      expectedBytes: download.totalBytes ?? reportedTotal,
      actualMd5,
      expectedMd5: download.expectedMd5,
    });

    if (!integrity.valid) {
      this.deps.logger.warn('downloads.integrity_failed', {
        audioId: download.audioId,
        reason: integrity.reason,
      });
      await this.deps.storage.remove(download.tempPath);
      await this.commit(
        transition(download, 'failed', now, {
          bytesDownloaded: 0,
          totalBytes: download.totalBytes,
          attempts: download.attempts + 1,
          errorCode: 'integrity',
          errorMessage: `Integrity check failed: ${integrity.reason}`,
        }),
      );
      return;
    }

    const finalBytes = await this.processFile(download, actualBytes);
    const finalPath = this.deps.storage.audioFilePath(
      download.audioId,
      download.fileExtension,
    );
    await this.deps.storage.move(download.tempPath, finalPath);
    const completed = transition(download, 'completed', now, {
      bytesDownloaded: finalBytes,
      totalBytes: finalBytes,
      localPath: finalPath,
      attempts: download.attempts,
      completedAt: now,
      verifiedAt: now,
    });
    await this.deps.repository.save(completed);
    this.forget(download);
    this.deps.logger.info('downloads.completed', {
      audioId: download.audioId,
      bytes: finalBytes,
    });
    this.deps.events.emit('downloads', 'library', 'collections');
  }

  /**
   * Runs the optional processor on a validated file and returns its final
   * size. A processing failure keeps the original, still playable, file.
   */
  private async processFile(download: Download, validatedBytes: number): Promise<number> {
    if (!this.deps.fileProcessor) {
      return validatedBytes;
    }
    try {
      const changed = await this.deps.fileProcessor.process(
        download.tempPath,
        download.fileExtension,
      );
      return changed
        ? (await this.deps.storage.fileSize(download.tempPath)) ?? validatedBytes
        : validatedBytes;
    } catch (error) {
      this.deps.logger.warn(
        'downloads.processing_failed',
        { audioId: download.audioId },
        error,
      );
      return validatedBytes;
    }
  }

  private async handleFailure(
    download: Download,
    code: DownloadErrorCode,
    httpStatus: number | undefined,
    message: string,
  ): Promise<void> {
    const now = this.deps.clock.nowIso();
    const attempts = download.attempts + 1;
    const partial = (await this.deps.storage.fileSize(download.tempPath)) ?? 0;
    const { autoRetryAttempts } = this.deps.getConfig();
    this.deps.logger.warn('downloads.failed', {
      audioId: download.audioId,
      code,
      httpStatus,
      attempts,
    });

    if (isRetryableError(code, httpStatus) && attempts <= autoRetryAttempts) {
      const delay = retryDelayMs(attempts);
      this.retryAfter.set(download.id, this.deps.clock.nowMs() + delay);
      await this.commit(
        transition(download, 'queued', now, {
          attempts,
          bytesDownloaded: partial,
          totalBytes: download.totalBytes,
        }),
      );
      this.scheduleRetry(download.id, delay);
      return;
    }
    await this.commit(
      transition(download, 'failed', now, {
        attempts,
        bytesDownloaded: partial,
        totalBytes: download.totalBytes,
        errorCode: code,
        errorMessage: message.slice(0, 300),
      }),
    );
    this.deps.events.emit('downloads');
  }

  private scheduleRetry(downloadId: string, delay: number): void {
    clearTimeout(this.retryTimers.get(downloadId));
    this.retryTimers.set(
      downloadId,
      setTimeout(() => {
        this.retryTimers.delete(downloadId);
        this.background(() => this.schedule());
      }, delay),
    );
  }

  private async onNetworkChange(status: NetworkStatus): Promise<void> {
    const { wifiOnly } = this.deps.getConfig();
    const blocked = !status.isConnected || (wifiOnly && !status.isWifi);
    if (blocked) {
      const now = this.deps.clock.nowIso();
      for (const download of [...this.active.values()]) {
        if (download.status === 'downloading') {
          const partial = await this.stopRunning(download);
          await this.commit(
            transition(download, 'queued', now, {
              bytesDownloaded: partial ?? download.bytesDownloaded,
              totalBytes: download.totalBytes,
              attempts: download.attempts,
            }),
          );
        }
      }
    }
    await this.schedule();
  }

  /** Stops a running task and returns the size of its partial file. */
  private async stopRunning(download: Download): Promise<number | undefined> {
    if (!this.running.has(download.id)) {
      return undefined;
    }
    this.running.delete(download.id);
    await this.deps.downloader.stop(download.id);
    return (await this.deps.storage.fileSize(download.tempPath)) ?? 0;
  }

  private async commit(download: Download): Promise<void> {
    await this.deps.repository.save(download);
    this.active.set(download.audioId, download);
    this.publish();
  }

  private forget(download: Download): void {
    this.active.delete(download.audioId);
    this.running.delete(download.id);
    this.lastPersist.delete(download.id);
    this.retryAfter.delete(download.id);
    clearTimeout(this.retryTimers.get(download.id));
    this.retryTimers.delete(download.id);
  }

  private findActiveById(downloadId: string): Download | undefined {
    for (const download of this.active.values()) {
      if (download.id === downloadId) {
        return download;
      }
    }
    return undefined;
  }

  private publish(): void {
    const byAudioId: Record<string, ActiveDownloadState> = {};
    for (const download of this.active.values()) {
      byAudioId[download.audioId] = {
        downloadId: download.id,
        audioId: download.audioId,
        status: download.status,
        bytesDownloaded: download.bytesDownloaded,
        totalBytes: download.totalBytes,
        errorCode: download.errorCode,
      };
    }
    this.snapshot = {
      byAudioId,
      aggregate: aggregateProgress([...this.active.values()]),
      waitingForNetwork: this.waitingForNetwork,
    };
    this.listeners.forEach(listener => listener(this.snapshot));
  }

  private serialForEach(
    predicate: (download: Download) => boolean,
    action: (audioId: string) => Promise<void>,
  ): Promise<void> {
    const ids = [...this.active.values()]
      .filter(predicate)
      .map(download => download.audioId);
    return Promise.all(ids.map(action)).then(() => undefined);
  }

  /**
   * Serial task triggered by native events/timers rather than by a caller.
   * Failures are already logged by `serial`, so the rejection is consumed here
   * to avoid unhandled-rejection noise.
   */
  private background(task: () => Promise<void>): void {
    this.serial(task).catch(() => undefined);
  }

  /** Runs `task` after every previously scheduled task (FIFO mutex). */
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(error => {
      this.deps.logger.error('downloads.task_failed', {}, error);
    });
    return result;
  }
}
