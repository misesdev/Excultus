import type { Audio, SourceType } from '../entities/Audio';
import type { AudioLibraryItem } from '../entities/AudioLibraryItem';

export interface AudioRepository {
  findById(id: string): Promise<Audio | null>;
  findBySource(sourceType: SourceType, sourceId: string): Promise<Audio | null>;
  /** Inserts or updates by id. */
  save(audio: Audio): Promise<void>;
  delete(id: string): Promise<void>;
  updateDuration(id: string, durationMs: number, nowIso: string): Promise<void>;

  findLibraryItem(id: string): Promise<AudioLibraryItem | null>;
  /** Returns items in the same order as `ids`, skipping unknown ids. */
  findLibraryItems(ids: readonly string[]): Promise<AudioLibraryItem[]>;
  countAll(): Promise<number>;
}

export interface FavoriteRepository {
  isFavorite(audioId: string): Promise<boolean>;
  setFavorite(audioId: string, favorite: boolean, nowIso: string): Promise<void>;
}
