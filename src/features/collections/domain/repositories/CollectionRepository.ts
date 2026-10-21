import type { AudioLibraryItem } from '@features/audios';
import type {
  Collection,
  CollectionSortMode,
  CollectionSummary,
} from '../entities/Collection';

export interface CollectionItemsQuery {
  sort: CollectionSortMode;
  /** Optional free-text filter applied inside the collection. */
  text?: string;
}

export interface CollectionRepository {
  listSummaries(): Promise<CollectionSummary[]>;
  findById(id: string): Promise<Collection | null>;
  findSummary(id: string): Promise<CollectionSummary | null>;
  insert(collection: Collection): Promise<void>;
  update(collection: Collection): Promise<void>;
  delete(id: string): Promise<void>;

  /** Appends audios at the end of the custom order; existing members are skipped. */
  addAudios(
    collectionId: string,
    audioIds: readonly string[],
    nowIso: string,
  ): Promise<number>;
  removeAudio(collectionId: string, audioId: string): Promise<void>;
  /** Persists a full custom order. `orderedAudioIds` must contain every member. */
  setOrder(collectionId: string, orderedAudioIds: readonly string[]): Promise<void>;

  listItems(
    collectionId: string,
    query: CollectionItemsQuery,
  ): Promise<AudioLibraryItem[]>;
  listAudioIds(collectionId: string, sort: CollectionSortMode): Promise<string[]>;
  /** Audios that belong to this collection and to no other collection or playlist. */
  findExclusiveAudioIds(collectionId: string): Promise<string[]>;
  findCollectionIdsForAudio(audioId: string): Promise<string[]>;
}
