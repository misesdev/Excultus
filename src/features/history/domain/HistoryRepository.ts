import type { PageRequest } from '@core/types';
import type { AudioLibraryItem } from '@features/audios';

export interface HistoryEntry {
  id: number;
  audioId: string;
  playedAt: string;
  positionMs: number;
}

export interface HistoryListEntry {
  entry: HistoryEntry;
  item: AudioLibraryItem;
}

/** Consecutive plays of the same audio within this window collapse into one entry. */
export const HISTORY_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export interface HistoryRepository {
  /** Records a play, merging with the latest entry when it is the same audio and recent. */
  record(audioId: string, positionMs: number, nowIso: string): Promise<void>;
  listRecent(page: PageRequest): Promise<HistoryListEntry[]>;
  /** Started but not completed audios, most recently played first. */
  listInProgress(limit: number): Promise<AudioLibraryItem[]>;
  clear(): Promise<void>;
}
