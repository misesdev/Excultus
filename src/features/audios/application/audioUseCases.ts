import type { Clock, EventBus } from '@core/application';
import { NotFoundError } from '@core/errors';
import type { AudioLibraryItem } from '../domain/entities/AudioLibraryItem';
import type {
  AudioRepository,
  FavoriteRepository,
} from '../domain/repositories/AudioRepository';

/** Removes every local file (final or partial) associated with an audio. */
export interface AudioFileCleaner {
  removeFilesFor(audioId: string): Promise<void>;
}

/** Removes an audio from the active playback queue (implemented by the player). */
export interface PlaybackQueueCleaner {
  forgetAudio(audioId: string): Promise<void>;
}

export interface AudioUseCaseDeps {
  audios: AudioRepository;
  favorites: FavoriteRepository;
  fileCleaner: AudioFileCleaner;
  playback: PlaybackQueueCleaner;
  events: EventBus;
  clock: Clock;
}

export function createAudioUseCases(deps: AudioUseCaseDeps) {
  const { audios, favorites, fileCleaner, playback, events, clock } = deps;
  return {
    async getItem(audioId: string): Promise<AudioLibraryItem> {
      const item = await audios.findLibraryItem(audioId);
      if (!item) {
        throw new NotFoundError('Audio', audioId);
      }
      return item;
    },

    getItems(audioIds: readonly string[]): Promise<AudioLibraryItem[]> {
      return audios.findLibraryItems(audioIds);
    },

    async toggleFavorite(audioId: string): Promise<boolean> {
      const next = !(await favorites.isFavorite(audioId));
      await favorites.setFavorite(audioId, next, clock.nowIso());
      events.emit('library');
      return next;
    },

    /**
     * Removes the audio from the library entirely: playback queue and files
     * first (so no orphan files remain if the process dies), then the record,
     * whose foreign keys cascade to collections, playlists, progress,
     * bookmarks and history.
     */
    async deleteFromLibrary(audioId: string): Promise<void> {
      await playback.forgetAudio(audioId);
      await fileCleaner.removeFilesFor(audioId);
      await audios.delete(audioId);
      events.emit(
        'library',
        'collections',
        'downloads',
        'playlists',
        'bookmarks',
        'history',
      );
    },
  };
}

export type AudioUseCases = ReturnType<typeof createAudioUseCases>;
