import type {
  Clock,
  DocumentPicker,
  EventBus,
  FileStorage,
  IdGenerator,
  Logger,
} from '@core/application';
import { NotFoundError, UnsupportedFormatError } from '@core/errors';
import { fileExtension } from '@core/utils';
import type { AudioLibraryItem } from '@features/audios';
import {
  createCollection,
  normalizeCollectionInput,
  type Collection,
  type CollectionInput,
  type CollectionSortMode,
  type CollectionSummary,
} from '../domain/entities/Collection';
import type {
  CollectionItemsQuery,
  CollectionRepository,
} from '../domain/repositories/CollectionRepository';

/** Removes a downloaded file while keeping the audio metadata in the library. */
export interface DownloadedFileRemover {
  deleteDownloadedFile(audioId: string): Promise<void>;
}

export type CollectionDeletionMode =
  /** Keep every downloaded file; audios stay available offline in the library. */
  | 'keep-files'
  /** Delete downloads used only by this collection; shared files are preserved. */
  | 'delete-exclusive-downloads';

export interface CollectionDetail {
  summary: CollectionSummary;
  items: AudioLibraryItem[];
}

export interface CollectionUseCaseDeps {
  collections: CollectionRepository;
  downloads: DownloadedFileRemover;
  storage: FileStorage;
  picker: DocumentPicker;
  events: EventBus;
  clock: Clock;
  generateId: IdGenerator;
  logger: Logger;
}

const SUPPORTED_ARTWORK_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function ownedArtworkPrefix(collectionId: string): string {
  return `collection-${collectionId}-`;
}

export function createCollectionUseCases(deps: CollectionUseCaseDeps) {
  const { collections, downloads, storage, picker, events, clock, generateId, logger } =
    deps;

  async function requireCollection(id: string): Promise<Collection> {
    const collection = await collections.findById(id);
    if (!collection) {
      throw new NotFoundError('Collection', id);
    }
    return collection;
  }

  async function removeOwnedArtwork(collection: Collection): Promise<void> {
    const path = collection.artworkPath;
    const fileName = path?.split('/').pop() ?? '';
    // Imported artwork may be shared with audios; only files created for
    // this collection are deleted.
    if (path && fileName.startsWith(ownedArtworkPrefix(collection.id))) {
      await storage.remove(path);
    }
  }

  return {
    list(): Promise<CollectionSummary[]> {
      return collections.listSummaries();
    },

    get(id: string): Promise<Collection> {
      return requireCollection(id);
    },

    async getDetail(
      id: string,
      query: Partial<CollectionItemsQuery> = {},
    ): Promise<CollectionDetail> {
      const summary = await collections.findSummary(id);
      if (!summary) {
        throw new NotFoundError('Collection', id);
      }
      const items = await collections.listItems(id, {
        sort: query.sort ?? summary.collection.sortMode,
        text: query.text,
      });
      return { summary, items };
    },

    async create(input: CollectionInput): Promise<Collection> {
      const collection = createCollection(input, generateId(), clock.nowIso());
      await collections.insert(collection);
      events.emit('collections');
      return collection;
    },

    async update(id: string, input: CollectionInput): Promise<Collection> {
      const current = await requireCollection(id);
      const normalized = normalizeCollectionInput(input);
      const updated: Collection = {
        ...current,
        name: normalized.name,
        description: normalized.description,
        updatedAt: clock.nowIso(),
      };
      await collections.update(updated);
      events.emit('collections');
      return updated;
    },

    async setSortMode(id: string, sortMode: CollectionSortMode): Promise<void> {
      const current = await requireCollection(id);
      await collections.update({ ...current, sortMode, updatedAt: clock.nowIso() });
      events.emit('collections');
    },

    async delete(id: string, mode: CollectionDeletionMode): Promise<void> {
      const collection = await requireCollection(id);
      if (mode === 'delete-exclusive-downloads') {
        const exclusive = await collections.findExclusiveAudioIds(id);
        for (const audioId of exclusive) {
          await downloads.deleteDownloadedFile(audioId);
        }
        logger.info('collection.delete.files_removed', {
          collectionId: id,
          count: exclusive.length,
        });
      }
      await collections.delete(id);
      await removeOwnedArtwork(collection);
      events.emit('collections', 'library', 'downloads');
    },

    async addAudios(collectionId: string, audioIds: readonly string[]): Promise<number> {
      await requireCollection(collectionId);
      const added = await collections.addAudios(collectionId, audioIds, clock.nowIso());
      events.emit('collections');
      return added;
    },

    async removeAudio(collectionId: string, audioId: string): Promise<void> {
      await collections.removeAudio(collectionId, audioId);
      events.emit('collections');
    },

    async reorder(
      collectionId: string,
      orderedAudioIds: readonly string[],
    ): Promise<void> {
      const current = await requireCollection(collectionId);
      await collections.setOrder(collectionId, orderedAudioIds);
      if (current.sortMode !== 'custom') {
        await collections.update({
          ...current,
          sortMode: 'custom',
          updatedAt: clock.nowIso(),
        });
      }
      events.emit('collections');
    },

    listAudioIds(collectionId: string, sort: CollectionSortMode): Promise<string[]> {
      return collections.listAudioIds(collectionId, sort);
    },

    findCollectionIdsForAudio(audioId: string): Promise<string[]> {
      return collections.findCollectionIdsForAudio(audioId);
    },

    /** Lets the user pick an image and stores an app-owned copy as cover. */
    async chooseArtwork(collectionId: string): Promise<boolean> {
      const collection = await requireCollection(collectionId);
      const picked = await picker.pickImage();
      if (!picked) {
        return false;
      }
      const extension = fileExtension(picked.name) ?? 'jpg';
      if (!SUPPORTED_ARTWORK_EXTENSIONS.includes(extension)) {
        await storage.remove(picked.localPath);
        throw new UnsupportedFormatError('Unsupported artwork format', {
          details: { extension },
        });
      }
      const target = storage.artworkFilePath(
        `${ownedArtworkPrefix(collectionId)}${generateId()}`,
        extension,
      );
      await storage.move(picked.localPath, target);
      await removeOwnedArtwork(collection);
      await collections.update({
        ...collection,
        artworkPath: target,
        updatedAt: clock.nowIso(),
      });
      events.emit('collections');
      return true;
    },

    async removeArtwork(collectionId: string): Promise<void> {
      const collection = await requireCollection(collectionId);
      await removeOwnedArtwork(collection);
      await collections.update({
        ...collection,
        artworkPath: undefined,
        updatedAt: clock.nowIso(),
      });
      events.emit('collections');
    },
  };
}

export type CollectionUseCases = ReturnType<typeof createCollectionUseCases>;
