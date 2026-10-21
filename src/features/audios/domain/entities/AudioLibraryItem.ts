import type { Audio } from './Audio';

/**
 * Offline state derived from the persisted download record. A file only
 * counts as available after it was downloaded *and* validated.
 */
export type OfflineState =
  | 'not-downloaded'
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'failed'
  | 'available';

export interface AudioProgressSnapshot {
  positionMs: number;
  durationMs?: number;
  completed: boolean;
  lastPlayedAt: string;
}

/** Read model combining an audio with its storage, progress and favorite state. */
export interface AudioLibraryItem {
  audio: Audio;
  offline: OfflineState;
  /** Verified local file; only set when `offline === 'available'`. */
  localPath?: string;
  progress?: AudioProgressSnapshot;
  isFavorite: boolean;
}

export function progressRatio(item: AudioLibraryItem): number {
  const duration = item.progress?.durationMs ?? item.audio.durationMs;
  if (!item.progress) {
    return 0;
  }
  if (item.progress.completed) {
    return 1;
  }
  if (!duration || duration <= 0) {
    return 0;
  }
  return Math.min(1, item.progress.positionMs / duration);
}

export function isInProgress(item: AudioLibraryItem): boolean {
  return !!item.progress && !item.progress.completed && item.progress.positionMs > 0;
}
