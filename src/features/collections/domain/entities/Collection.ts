import { optionalText, requireName } from '@core/domain/validation';

export const COLLECTION_SORT_MODES = ['custom', 'title', 'addedAt', 'duration'] as const;
export type CollectionSortMode = (typeof COLLECTION_SORT_MODES)[number];

export interface Collection {
  id: string;
  name: string;
  description?: string;
  artworkPath?: string;
  /** Last sort chosen by the user for this collection. */
  sortMode: CollectionSortMode;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionInput {
  name: string;
  description?: string;
}

export const COLLECTION_NAME_MAX_LENGTH = 80;
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 500;

/** Framework-independent validation shared by every entry point. */
export function normalizeCollectionInput(input: CollectionInput): CollectionInput {
  return {
    name: requireName(input.name, 'name', COLLECTION_NAME_MAX_LENGTH),
    description: optionalText(
      input.description,
      'description',
      COLLECTION_DESCRIPTION_MAX_LENGTH,
    ),
  };
}

export function createCollection(
  input: CollectionInput,
  id: string,
  nowIso: string,
): Collection {
  const normalized = normalizeCollectionInput(input);
  return {
    id,
    name: normalized.name,
    description: normalized.description,
    sortMode: 'custom',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export interface CollectionSummary {
  collection: Collection;
  audioCount: number;
  totalDurationMs: number;
  offlineCount: number;
  /** Listened time, counting completed audios in full. */
  listenedMs: number;
}

export function collectionProgress(summary: CollectionSummary): number {
  if (summary.totalDurationMs <= 0) {
    return 0;
  }
  return Math.min(1, summary.listenedMs / summary.totalDurationMs);
}
