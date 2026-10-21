import type { Clock, EventBus, IdGenerator } from '@core/application';
import { NotFoundError } from '@core/errors';
import type { AudioLibraryItem } from '@features/audios';
import {
  createPlaylist,
  normalizePlaylistInput,
  type Playlist,
  type PlaylistInput,
  type PlaylistRepository,
  type PlaylistSummary,
} from '../domain/Playlist';

export interface PlaylistUseCaseDeps {
  playlists: PlaylistRepository;
  events: EventBus;
  clock: Clock;
  generateId: IdGenerator;
}

export function createPlaylistUseCases({
  playlists,
  events,
  clock,
  generateId,
}: PlaylistUseCaseDeps) {
  async function requirePlaylist(id: string): Promise<Playlist> {
    const playlist = await playlists.findById(id);
    if (!playlist) {
      throw new NotFoundError('Playlist', id);
    }
    return playlist;
  }

  return {
    list(): Promise<PlaylistSummary[]> {
      return playlists.listSummaries();
    },

    async getDetail(
      id: string,
    ): Promise<{ playlist: Playlist; items: AudioLibraryItem[] }> {
      const playlist = await requirePlaylist(id);
      return { playlist, items: await playlists.listItems(id) };
    },

    async create(input: PlaylistInput): Promise<Playlist> {
      const playlist = createPlaylist(input, generateId(), clock.nowIso());
      await playlists.insert(playlist);
      events.emit('playlists');
      return playlist;
    },

    async update(id: string, input: PlaylistInput): Promise<Playlist> {
      const current = await requirePlaylist(id);
      const updated: Playlist = {
        ...current,
        ...normalizePlaylistInput(input),
        updatedAt: clock.nowIso(),
      };
      await playlists.update(updated);
      events.emit('playlists');
      return updated;
    },

    async delete(id: string): Promise<void> {
      await playlists.delete(id);
      events.emit('playlists');
    },

    async addAudios(playlistId: string, audioIds: readonly string[]): Promise<number> {
      await requirePlaylist(playlistId);
      const added = await playlists.addAudios(playlistId, audioIds, clock.nowIso());
      events.emit('playlists');
      return added;
    },

    async removeAudio(playlistId: string, audioId: string): Promise<void> {
      await playlists.removeAudio(playlistId, audioId);
      events.emit('playlists');
    },

    async reorder(playlistId: string, orderedAudioIds: readonly string[]): Promise<void> {
      await playlists.setOrder(playlistId, orderedAudioIds);
      events.emit('playlists');
    },

    findPlaylistIdsForAudio(audioId: string): Promise<string[]> {
      return playlists.findPlaylistIdsForAudio(audioId);
    },
  };
}

export type PlaylistUseCases = ReturnType<typeof createPlaylistUseCases>;
