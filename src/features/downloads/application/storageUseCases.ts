import type { Clock, EventBus, FileStorage, Logger } from '@core/application';
import { transition } from '../domain/entities/Download';
import type {
  DownloadListEntry,
  DownloadRepository,
} from '../domain/repositories/DownloadRepository';
import type { DownloadManager } from './DownloadManager';
import type { DownloadedFileProcessor } from './ports';

export interface StorageUsage {
  audioBytes: number;
  audioFileCount: number;
  artworkBytes: number;
  tempBytes: number;
  freeBytes: number;
}

export interface VerificationReport {
  checked: number;
  missing: number;
  orphansRemoved: number;
}

export interface StorageUseCaseDeps {
  repository: DownloadRepository;
  manager: DownloadManager;
  storage: FileStorage;
  events: EventBus;
  clock: Clock;
  logger: Logger;
  fileProcessor?: DownloadedFileProcessor;
}

const sumSizes = (files: ReadonlyArray<{ sizeBytes: number }>) =>
  files.reduce((total, file) => total + file.sizeBytes, 0);

export function createStorageUseCases(deps: StorageUseCaseDeps) {
  const { repository, manager, storage, events, clock, logger, fileProcessor } = deps;

  return {
    listDownloads(): Promise<DownloadListEntry[]> {
      return repository.listEntries();
    },

    async getUsage(): Promise<StorageUsage> {
      const [audio, artwork, temp, freeBytes] = await Promise.all([
        storage.listFiles('audio'),
        storage.listFiles('artwork'),
        storage.listFiles('temp'),
        storage.freeSpaceBytes(),
      ]);
      return {
        audioBytes: sumSizes(audio),
        audioFileCount: audio.length,
        artworkBytes: sumSizes(artwork),
        tempBytes: sumSizes(temp),
        freeBytes,
      };
    },

    /** Removes partial files that no active download can resume. Returns bytes freed. */
    async cleanTemporaryFiles(): Promise<number> {
      const keep = manager.activeTempPaths();
      const temp = await storage.listFiles('temp');
      let freed = 0;
      for (const file of temp) {
        if (!keep.has(file.path)) {
          await storage.remove(file.path);
          freed += file.sizeBytes;
        }
      }
      logger.info('storage.temp_cleaned', { freed });
      return freed;
    },

    /**
     * Confirms every completed download still has its file. Missing files are
     * flagged (so the UI stops presenting them as offline) and files no record
     * references are removed.
     */
    async verifyLocalFiles(): Promise<VerificationReport> {
      const completed = await repository.findByStatus(['completed']);
      const referenced = new Set<string>();
      let missing = 0;
      for (const download of completed) {
        const size = download.localPath
          ? await storage.fileSize(download.localPath)
          : null;
        if (download.localPath && size !== null && size > 0) {
          referenced.add(download.localPath);
          continue;
        }
        missing++;
        await repository.save(
          transition(download, 'failed', clock.nowIso(), {
            localPath: undefined,
            bytesDownloaded: 0,
            totalBytes: download.totalBytes,
            errorCode: 'file-missing',
            errorMessage: 'Local file not found during verification',
          }),
        );
      }
      let orphansRemoved = 0;
      for (const file of await storage.listFiles('audio')) {
        if (!referenced.has(file.path)) {
          await storage.remove(file.path);
          orphansRemoved++;
        }
      }
      logger.info('storage.verified', {
        checked: completed.length,
        missing,
        orphansRemoved,
      });
      if (missing > 0 || orphansRemoved > 0) {
        events.emit('downloads', 'library', 'collections');
      }
      return { checked: completed.length, missing, orphansRemoved };
    },

    /**
     * Applies the file processor to downloads completed before it existed
     * (e.g. fragmented YouTube M4A). Already processed files are a cheap no-op.
     */
    async processDownloadedFiles(): Promise<number> {
      if (!fileProcessor) {
        return 0;
      }
      let processed = 0;
      for (const download of await repository.findByStatus(['completed'])) {
        if (!download.localPath) {
          continue;
        }
        try {
          if (await fileProcessor.process(download.localPath, download.fileExtension)) {
            processed++;
          }
        } catch (error) {
          logger.warn('storage.processing_failed', { audioId: download.audioId }, error);
        }
      }
      if (processed > 0) {
        logger.info('storage.files_processed', { processed });
      }
      return processed;
    },

    /** Deletes every downloaded file, keeping all metadata. */
    async deleteAllDownloads(): Promise<number> {
      const entries = await repository.findByStatus(['completed']);
      for (const download of entries) {
        await manager.deleteDownloadedFile(download.audioId);
      }
      return entries.length;
    },

    /**
     * Returns the verified local file for an audio, or null. A record whose
     * file disappeared is flagged so the library reflects reality.
     */
    async findPlayableLocalPath(audioId: string): Promise<string | null> {
      const download = await repository.findByAudioId(audioId);
      if (download?.status !== 'completed' || !download.localPath) {
        return null;
      }
      if (await storage.exists(download.localPath)) {
        return download.localPath;
      }
      await repository.save(
        transition(download, 'failed', clock.nowIso(), {
          localPath: undefined,
          bytesDownloaded: 0,
          totalBytes: download.totalBytes,
          errorCode: 'file-missing',
          errorMessage: 'Local file not found before playback',
        }),
      );
      events.emit('downloads', 'library');
      return null;
    },
  };
}

export type StorageUseCases = ReturnType<typeof createStorageUseCases>;
