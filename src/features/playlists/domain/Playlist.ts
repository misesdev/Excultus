import { optionalText, requireName } from '@core/domain/validation';
import type { AudioLibraryItem } from '@features/audios';

/**
 * A playlist is a user-defined playback sequence. Unlike a collection it
 * does not organize the library; unlike the queue it is persistent.
 */
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistInput {
  name: string;
  description?: string;
}

export interface PlaylistSummary {
  playlist: Playlist;
  audioCount: number;
  totalDurationMs: number;
}

export const PLAYLIST_NAME_MAX_LENGTH = 80;
export const PLAYLIST_DESCRIPTION_MAX_LENGTH = 300;

export function normalizePlaylistInput(input: PlaylistInput): PlaylistInput {
  return {
    name: requireName(input.name, 'name', PLAYLIST_NAME_MAX_LENGTH),
    description: optionalText(
      input.description,
      'description',
      PLAYLIST_DESCRIPTION_MAX_LENGTH,
    ),
  };
}

export function createPlaylist(
  input: PlaylistInput,
  id: string,
  nowIso: string,
): Playlist {
  return { id, ...normalizePlaylistInput(input), createdAt: nowIso, updatedAt: nowIso };
}

export interface PlaylistRepository {
  listSummaries(): Promise<PlaylistSummary[]>;
  findById(id: string): Promise<Playlist | null>;
  insert(playlist: Playlist): Promise<void>;
  update(playlist: Playlist): Promise<void>;
  delete(id: string): Promise<void>;
  addAudios(
    playlistId: string,
    audioIds: readonly string[],
    nowIso: string,
  ): Promise<number>;
  removeAudio(playlistId: string, audioId: string): Promise<void>;
  setOrder(playlistId: string, orderedAudioIds: readonly string[]): Promise<void>;
  listItems(playlistId: string): Promise<AudioLibraryItem[]>;
  findPlaylistIdsForAudio(audioId: string): Promise<string[]>;
}
