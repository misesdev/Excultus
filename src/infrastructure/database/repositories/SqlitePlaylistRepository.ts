import type { AudioLibraryItem } from '@features/audios';
import type { Playlist, PlaylistRepository, PlaylistSummary } from '@features/playlists';
import { LIBRARY_ITEM_SELECT, mapLibraryItem } from '../mappers/audioMappers';
import { readNumber, readOptionalString, readString, toSql } from '../rowReaders';
import type { SqlExecutor, SqlRow } from '../SqlDatabase';
import {
  addMembers,
  removeMember,
  setMemberOrder,
  type MembershipTable,
} from './orderedMembership';

const MEMBERSHIP: MembershipTable = {
  table: 'playlist_audios',
  ownerColumn: 'playlist_id',
};

function mapPlaylist(row: SqlRow): Playlist {
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    description: readOptionalString(row, 'description'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

export class SqlitePlaylistRepository implements PlaylistRepository {
  constructor(private readonly db: SqlExecutor) {}

  async listSummaries(): Promise<PlaylistSummary[]> {
    const { rows } = await this.db.execute(
      `SELECT pl.*, COUNT(pa.audio_id) AS audio_count, COALESCE(SUM(a.duration_ms), 0) AS total_duration
       FROM playlists pl
       LEFT JOIN playlist_audios pa ON pa.playlist_id = pl.id
       LEFT JOIN audios a ON a.id = pa.audio_id
       GROUP BY pl.id ORDER BY pl.updated_at DESC`,
    );
    return rows.map(row => ({
      playlist: mapPlaylist(row),
      audioCount: readNumber(row, 'audio_count'),
      totalDurationMs: readNumber(row, 'total_duration'),
    }));
  }

  async findById(id: string): Promise<Playlist | null> {
    const { rows } = await this.db.execute('SELECT * FROM playlists WHERE id = ?', [id]);
    return rows[0] ? mapPlaylist(rows[0]) : null;
  }

  async insert(playlist: Playlist): Promise<void> {
    await this.db.execute(
      'INSERT INTO playlists (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [
        playlist.id,
        playlist.name,
        toSql(playlist.description),
        playlist.createdAt,
        playlist.updatedAt,
      ],
    );
  }

  async update(playlist: Playlist): Promise<void> {
    await this.db.execute(
      'UPDATE playlists SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [playlist.name, toSql(playlist.description), playlist.updatedAt, playlist.id],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM playlists WHERE id = ?', [id]);
  }

  addAudios(
    playlistId: string,
    audioIds: readonly string[],
    nowIso: string,
  ): Promise<number> {
    return addMembers(this.db, MEMBERSHIP, playlistId, audioIds, nowIso);
  }

  removeAudio(playlistId: string, audioId: string): Promise<void> {
    return removeMember(this.db, MEMBERSHIP, playlistId, audioId);
  }

  setOrder(playlistId: string, orderedAudioIds: readonly string[]): Promise<void> {
    return setMemberOrder(this.db, MEMBERSHIP, playlistId, orderedAudioIds);
  }

  async listItems(playlistId: string): Promise<AudioLibraryItem[]> {
    const { rows } = await this.db.execute(
      `${LIBRARY_ITEM_SELECT}
       JOIN playlist_audios pa ON pa.audio_id = a.id
       WHERE pa.playlist_id = ? ORDER BY pa.position ASC`,
      [playlistId],
    );
    return rows.map(mapLibraryItem);
  }

  async findPlaylistIdsForAudio(audioId: string): Promise<string[]> {
    const { rows } = await this.db.execute(
      'SELECT playlist_id FROM playlist_audios WHERE audio_id = ?',
      [audioId],
    );
    return rows.map(row => readString(row, 'playlist_id'));
  }
}
