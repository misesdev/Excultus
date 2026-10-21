import type {
  Clock,
  DocumentPicker,
  FileStorage,
  Logger,
  NetworkMonitor,
  NetworkStatus,
  PickedFile,
  StorageArea,
  StoredFile,
} from '@core/application';
import { NetworkError, SourceUnavailableError } from '@core/errors';
import type { Unsubscribe } from '@core/types';
import type {
  FileDownloader,
  FileDownloaderEvent,
  FileDownloadRequest,
} from '@features/downloads';
import type {
  YouTubeExtractor,
  YouTubePlaylist,
  YouTubeVideo,
} from '@infrastructure/external-sources/youtube/YouTubeExtractor';

/** Test doubles for infrastructure ports. Never used by production code. */

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export class FakeClock implements Clock {
  constructor(private currentMs = Date.parse('2026-01-01T10:00:00.000Z')) {}
  nowIso = () => new Date(this.currentMs).toISOString();
  nowMs = () => this.currentMs;
  advance(ms: number): void {
    this.currentMs += ms;
  }
}

export function sequentialIds(prefix = 'id'): () => string {
  // Unique per factory so containers sharing a database never collide.
  const unique = `${prefix}${Math.round(Math.random() * 1e6)}`;
  let counter = 0;
  return () => `${unique}-${String(++counter).padStart(4, '0')}`;
}

/** In-memory file system with the same semantics as the real adapter. */
export class InMemoryFileStorage implements FileStorage {
  readonly files = new Map<string, string>();
  freeBytes = 10 * 1024 * 1024 * 1024;
  readonly remoteFiles = new Map<string, string>();

  ensureDirectories = async () => undefined;
  audioFilePath = (audioId: string, extension: string) =>
    `/app/audio/${audioId}.${extension}`;
  tempFilePath = (downloadId: string) => `/app/temp/${downloadId}.part`;
  artworkFilePath = (id: string, extension: string) => `/app/artwork/${id}.${extension}`;
  exportFilePath = (fileName: string) => `/app/exports/${fileName}`;
  toFileUri = (path: string) => `file://${path}`;

  async exists(path: string) {
    return this.files.has(path);
  }
  async fileSize(path: string) {
    const content = this.files.get(path);
    return content === undefined ? null : content.length;
  }
  async move(from: string, to: string) {
    const content = this.files.get(from);
    if (content === undefined) {
      throw new Error(`missing ${from}`);
    }
    this.files.delete(from);
    this.files.set(to, content);
  }
  async copy(from: string, to: string) {
    const content = this.files.get(from);
    if (content === undefined) {
      throw new Error(`missing ${from}`);
    }
    this.files.set(to, content);
  }
  async remove(path: string) {
    this.files.delete(path);
  }
  async md5(path: string) {
    return `md5:${this.files.get(path) ?? ''}`;
  }
  async freeSpaceBytes() {
    return this.freeBytes;
  }
  async listFiles(area: StorageArea): Promise<StoredFile[]> {
    const prefix = `/app/${area}/`;
    return [...this.files.entries()]
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, content]) => ({
        path,
        name: path.slice(prefix.length),
        sizeBytes: content.length,
      }));
  }
  async readText(path: string) {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`missing ${path}`);
    }
    return content;
  }
  async writeText(path: string, content: string) {
    this.files.set(path, content);
  }
  async downloadSmallFile(url: string, path: string) {
    const content = this.remoteFiles.get(url);
    if (content === undefined) {
      throw new Error(`404 ${url}`);
    }
    this.files.set(path, content);
  }
}

export class FakeNetworkMonitor implements NetworkMonitor {
  private listeners = new Set<(status: NetworkStatus) => void>();
  constructor(public status: NetworkStatus = { isConnected: true, isWifi: true }) {}
  async getStatus() {
    return this.status;
  }
  subscribe(listener: (status: NetworkStatus) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  set(status: NetworkStatus) {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
  }
}

/**
 * Scriptable downloader: tests decide when each task progresses, completes
 * or fails, and the fake writes bytes into the in-memory storage.
 */
export class FakeFileDownloader implements FileDownloader {
  readonly started: FileDownloadRequest[] = [];
  readonly completedTasks = new Set<string>();
  readonly stopped: string[] = [];
  private listeners = new Set<(event: FileDownloaderEvent) => void>();

  constructor(private readonly storage: InMemoryFileStorage) {}

  async start(request: FileDownloadRequest) {
    this.started.push(request);
  }
  async stop(taskId: string) {
    this.stopped.push(taskId);
  }
  subscribe(listener: (event: FileDownloaderEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  request(taskId: string): FileDownloadRequest {
    const found = [...this.started].reverse().find(item => item.taskId === taskId);
    if (!found) {
      throw new Error(`task ${taskId} was not started`);
    }
    return found;
  }

  writeBytes(taskId: string, content: string) {
    const { destinationPath } = this.request(taskId);
    this.storage.files.set(
      destinationPath,
      (this.storage.files.get(destinationPath) ?? '') + content,
    );
    this.emit({
      type: 'progress',
      taskId,
      bytesWritten: this.storage.files.get(destinationPath)?.length ?? 0,
    });
  }

  complete(taskId: string, content?: string) {
    if (content !== undefined) {
      this.writeBytes(taskId, content);
    }
    const size =
      this.storage.files.get(this.request(taskId).destinationPath)?.length ?? 0;
    this.completedTasks.add(taskId);
    this.emit({ type: 'completed', taskId, bytesWritten: size, totalBytes: size });
  }

  fail(
    taskId: string,
    reason: 'network' | 'http' | 'storage' | 'io',
    httpStatus?: number,
  ) {
    this.emit({
      type: 'failed',
      taskId,
      reason,
      httpStatus,
      message: `${reason} failure`,
    });
  }

  private emit(event: FileDownloaderEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}

export class FakeDocumentPicker implements DocumentPicker {
  audioFiles: PickedFile[] = [];
  image: PickedFile | null = null;
  json: PickedFile | null = null;
  saved: Array<{ sourcePath: string; fileName: string }> = [];

  async pickAudioFiles() {
    return this.audioFiles;
  }
  async pickImage() {
    return this.image;
  }
  async pickJsonFile() {
    return this.json;
  }
  async saveFileAs(sourcePath: string, fileName: string) {
    this.saved.push({ sourcePath, fileName });
    return true;
  }
}

/** Resolves once every pending promise callback has run. */
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Fixture-driven YouTube extractor. Unknown ids reject as unavailable;
 * `offline` makes every call fail with a network error.
 */
export class FakeYouTubeExtractor implements YouTubeExtractor {
  readonly videos = new Map<string, YouTubeVideo>();
  readonly playlists = new Map<string, YouTubePlaylist>();
  readonly resolved: string[] = [];
  offline = false;
  private streamCounter = 0;

  addVideo(id: string, overrides: Partial<YouTubeVideo> = {}): YouTubeVideo {
    const video: YouTubeVideo = {
      id,
      title: `Vídeo ${id}`,
      uploader: 'Canal',
      durationMs: 60_000,
      streamUrl: '',
      mimeType: 'audio/mp4',
      contentLength: 5,
      ...overrides,
    };
    this.videos.set(id, video);
    return video;
  }

  async resolveVideo(videoId: string): Promise<YouTubeVideo> {
    this.check();
    this.resolved.push(videoId);
    const video = this.videos.get(videoId);
    if (!video) {
      throw new SourceUnavailableError('Video unavailable', {
        userMessage: 'Este vídeo do YouTube não pode ser baixado.',
      });
    }
    // Real stream URLs are short-lived: every resolution yields a new one.
    this.streamCounter++;
    return {
      ...video,
      streamUrl: `https://rr1.googlevideo.com/videoplayback?id=${videoId}&n=${this.streamCounter}`,
    };
  }

  async getPlaylist(playlistId: string, maxEntries: number): Promise<YouTubePlaylist> {
    this.check();
    const playlist = this.playlists.get(playlistId);
    if (!playlist) {
      throw new SourceUnavailableError('Playlist unavailable');
    }
    return {
      ...playlist,
      entries: playlist.entries.slice(0, maxEntries),
      truncated: playlist.entries.length > maxEntries,
    };
  }

  private check(): void {
    if (this.offline) {
      throw new NetworkError();
    }
  }
}
