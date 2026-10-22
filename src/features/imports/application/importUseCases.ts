import type {
  Clock,
  EventBus,
  FileStorage,
  IdGenerator,
  Logger,
  UnitOfWork,
} from '@core/application';
import { NotFoundError, ValidationError } from '@core/errors';
import {
  createAudio,
  mergeAudioMetadata,
  resolveAudioExtension,
  type AudioRepository,
  type NewAudioInput,
} from '@features/audios';
import { createCollection, type CollectionRepository } from '@features/collections';
import type { DownloadRequest, LocalFileRegistration } from '@features/downloads';
import type {
  LocalAudioSource,
  SourceAudioItem,
  SourceMetadata,
} from './AudioSourceProvider';
import type { SourceProviderRegistry } from './SourceProviderRegistry';
import { t } from '@core/i18n';

export interface ImportPreview {
  providerLabel: string;
  source: SourceMetadata;
  items: SourceAudioItem[];
  /** Device files that were rejected (unsupported format). */
  rejected: string[];
}

export type ImportTarget =
  | { kind: 'existing'; collectionId: string }
  | { kind: 'new'; name: string }
  | { kind: 'none' };

export interface ImportRequest {
  preview: ImportPreview;
  selectedSourceIds: readonly string[];
  target: ImportTarget;
  /** Queue downloads for downloadable items right away. */
  downloadNow: boolean;
}

export interface ImportResult {
  collectionId?: string;
  audioIds: string[];
  enqueuedDownloads: number;
}

/** Narrow view of the download manager needed by imports. */
export interface DownloadScheduler {
  enqueue(requests: readonly DownloadRequest[]): Promise<number>;
  registerLocalFile(registration: LocalFileRegistration): Promise<void>;
}

export interface ImportScope {
  audios: AudioRepository;
  collections: CollectionRepository;
}

export interface ImportUseCaseDeps {
  registry: SourceProviderRegistry;
  localSource: LocalAudioSource;
  unitOfWork: UnitOfWork<ImportScope>;
  downloads: DownloadScheduler;
  storage: FileStorage;
  events: EventBus;
  clock: Clock;
  generateId: IdGenerator;
  logger: Logger;
}

const ARTWORK_KEY_MAX_LENGTH = 80;

/** Physical artwork names derive from a sanitized source key, never raw titles. */
function artworkKey(source: SourceMetadata): string {
  const safe = `${source.sourceType}-${source.sourceId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return safe.slice(0, ARTWORK_KEY_MAX_LENGTH);
}

function toAudioInput(
  item: SourceAudioItem,
  source: SourceMetadata,
  artworkPath?: string,
): NewAudioInput {
  return {
    title: item.title,
    description: item.description,
    artist: item.artist ?? source.creator,
    album: item.album ?? source.title,
    durationMs: item.durationMs,
    artworkPath,
    sourceType: source.sourceType,
    sourceId: item.sourceId,
    sourceUrl: item.sourceUrl ?? source.originalUrl,
    mediaUrl: item.mediaUrl,
    mimeType: item.mimeType,
    fileSize: item.sizeBytes,
  };
}

export function createImportUseCases(deps: ImportUseCaseDeps) {
  const {
    registry,
    localSource,
    unitOfWork,
    downloads,
    storage,
    events,
    clock,
    generateId,
    logger,
  } = deps;

  async function saveArtwork(source: SourceMetadata): Promise<string | undefined> {
    if (!source.artworkUrl) {
      return undefined;
    }
    const path = storage.artworkFilePath(artworkKey(source), 'jpg');
    try {
      if (!(await storage.exists(path))) {
        await storage.downloadSmallFile(source.artworkUrl, path);
      }
      return path;
    } catch (error) {
      // Artwork is optional: the import continues with a generated placeholder.
      logger.warn('import.artwork_failed', { sourceId: source.sourceId }, error);
      await storage.remove(path);
      return undefined;
    }
  }

  async function discardLocalCopies(items: readonly SourceAudioItem[]): Promise<void> {
    for (const item of items) {
      if (item.acquisition.kind === 'copy') {
        await storage.remove(item.acquisition.localPath);
      }
    }
  }

  return {
    supportedSources(): string[] {
      return registry.labels();
    },

    async previewFromUrl(url: string): Promise<ImportPreview> {
      const trimmed = url.trim();
      const provider = registry.resolve(trimmed);
      const source = await provider.getMetadata(trimmed);
      const items = await provider.getAudioItems(trimmed);
      logger.info('import.preview', { provider: provider.id, items: items.length });
      return { providerLabel: provider.label, source, items, rejected: [] };
    },

    /** Returns null when the user dismissed the picker. */
    async previewLocalFiles(): Promise<ImportPreview | null> {
      const { metadata, items, rejected } = await localSource.pickAudioFiles();
      if (items.length === 0 && rejected.length === 0) {
        return null;
      }
      return {
        providerLabel: t('imports.sources.deviceFiles'),
        source: metadata,
        items,
        rejected,
      };
    },

    /** Cleans temporary local copies when the user abandons an import. */
    discardPreview(preview: ImportPreview): Promise<void> {
      return discardLocalCopies(preview.items);
    },

    async confirm(request: ImportRequest): Promise<ImportResult> {
      const selectedIds = new Set(request.selectedSourceIds);
      const selected = request.preview.items.filter(
        item => selectedIds.has(item.sourceId) && item.availability !== 'restricted',
      );
      if (selected.length === 0) {
        throw new ValidationError('Select at least one item to import', 'selection');
      }
      const { source } = request.preview;
      const artworkPath = await saveArtwork(source);
      const now = clock.nowIso();

      const { collectionId, audioIds } = await unitOfWork.run(async scope => {
        let targetId: string | undefined;
        if (request.target.kind === 'new') {
          const collection = createCollection(
            { name: request.target.name },
            generateId(),
            now,
          );
          await scope.collections.insert({ ...collection, artworkPath });
          targetId = collection.id;
        } else if (request.target.kind === 'existing') {
          const existing = await scope.collections.findById(request.target.collectionId);
          if (!existing) {
            throw new NotFoundError('Collection', request.target.collectionId);
          }
          if (!existing.artworkPath && artworkPath) {
            await scope.collections.update({ ...existing, artworkPath, updatedAt: now });
          }
          targetId = existing.id;
        }

        const ids: string[] = [];
        for (const item of selected) {
          const input = toAudioInput(item, source, artworkPath);
          const existing = await scope.audios.findBySource(
            source.sourceType,
            item.sourceId,
          );
          const audio = existing
            ? mergeAudioMetadata(existing, input, now)
            : createAudio(input, generateId(), now);
          await scope.audios.save(audio);
          ids.push(audio.id);
        }
        if (targetId) {
          await scope.collections.addAudios(targetId, ids, now);
        }
        return { collectionId: targetId, audioIds: ids };
      });

      // Side effects outside the transaction: files and the download queue.
      const downloadRequests: DownloadRequest[] = [];
      for (const [index, item] of selected.entries()) {
        const audioId = audioIds[index] as string;
        const extension =
          item.fileExtension ??
          resolveAudioExtension({ fileName: item.fileName, mimeType: item.mimeType });
        if (item.acquisition.kind === 'copy' && extension) {
          await downloads.registerLocalFile({
            audioId,
            sourcePath: item.acquisition.localPath,
            fileExtension: extension,
            sourceUri: item.acquisition.sourceUri,
          });
        } else if (
          item.acquisition.kind === 'download' &&
          request.downloadNow &&
          item.availability === 'available' &&
          extension
        ) {
          downloadRequests.push({
            audioId,
            url: item.acquisition.url,
            fileExtension: extension,
            expectedBytes: item.sizeBytes,
            expectedMd5: item.acquisition.expectedMd5,
          });
        }
      }
      await discardLocalCopies(
        request.preview.items.filter(item => !selectedIds.has(item.sourceId)),
      );
      const enqueuedDownloads =
        downloadRequests.length > 0 ? await downloads.enqueue(downloadRequests) : 0;

      logger.info('import.confirmed', {
        sourceType: source.sourceType,
        audios: audioIds.length,
        enqueuedDownloads,
      });
      events.emit('library', 'collections', 'downloads');
      return { collectionId, audioIds, enqueuedDownloads };
    },
  };
}

export type ImportUseCases = ReturnType<typeof createImportUseCases>;
