import type {
  Audio,
  AudioLibraryItem,
  AudioRepository,
  FavoriteRepository,
  SourceType,
} from '@features/audios';
import {
  audioToParams,
  AUDIO_COLUMNS,
  LIBRARY_ITEM_SELECT,
  mapAudio,
  mapLibraryItem,
} from '../mappers/audioMappers';
import { placeholders, readNumber } from '../rowReaders';
import type { SqlExecutor } from '../SqlDatabase';

/** SQLite caps bound parameters; large id lists are fetched in chunks. */
const MAX_IDS_PER_QUERY = 500;

export class SqliteAudioRepository implements AudioRepository {
  constructor(private readonly db: SqlExecutor) {}

  async findById(id: string): Promise<Audio | null> {
    const { rows } = await this.db.execute(
      `SELECT ${AUDIO_COLUMNS} FROM audios a WHERE a.id = ?`,
      [id],
    );
    return rows[0] ? mapAudio(rows[0]) : null;
  }

  async findBySource(sourceType: SourceType, sourceId: string): Promise<Audio | null> {
    const { rows } = await this.db.execute(
      `SELECT ${AUDIO_COLUMNS} FROM audios a WHERE a.source_type = ? AND a.source_id = ?`,
      [sourceType, sourceId],
    );
    return rows[0] ? mapAudio(rows[0]) : null;
  }

  async save(audio: Audio): Promise<void> {
    // UPSERT (never INSERT OR REPLACE): REPLACE deletes the row first, which
    // would cascade and wipe collection links, progress and downloads.
    await this.db.execute(
      `INSERT INTO audios (id, title, description, artist, album, duration_ms, artwork_path,
         source_type, source_id, source_url, media_url, mime_type, file_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         title = excluded.title, description = excluded.description, artist = excluded.artist,
         album = excluded.album, duration_ms = excluded.duration_ms, artwork_path = excluded.artwork_path,
         source_url = excluded.source_url, media_url = excluded.media_url,
         mime_type = excluded.mime_type, file_size = excluded.file_size, updated_at = excluded.updated_at`,
      audioToParams(audio),
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM audios WHERE id = ?', [id]);
  }

  async updateDuration(id: string, durationMs: number, nowIso: string): Promise<void> {
    await this.db.execute(
      'UPDATE audios SET duration_ms = ?, updated_at = ? WHERE id = ? AND duration_ms IS NULL',
      [Math.round(durationMs), nowIso, id],
    );
  }

  async findLibraryItem(id: string): Promise<AudioLibraryItem | null> {
    const { rows } = await this.db.execute(`${LIBRARY_ITEM_SELECT} WHERE a.id = ?`, [id]);
    return rows[0] ? mapLibraryItem(rows[0]) : null;
  }

  async findLibraryItems(ids: readonly string[]): Promise<AudioLibraryItem[]> {
    const byId = new Map<string, AudioLibraryItem>();
    for (let start = 0; start < ids.length; start += MAX_IDS_PER_QUERY) {
      const chunk = ids.slice(start, start + MAX_IDS_PER_QUERY);
      const { rows } = await this.db.execute(
        `${LIBRARY_ITEM_SELECT} WHERE a.id IN (${placeholders(chunk.length)})`,
        chunk,
      );
      rows.map(mapLibraryItem).forEach(item => byId.set(item.audio.id, item));
    }
    return ids.map(id => byId.get(id)).filter((item): item is AudioLibraryItem => !!item);
  }

  async countAll(): Promise<number> {
    const { rows } = await this.db.execute('SELECT COUNT(*) AS total FROM audios');
    return rows[0] ? readNumber(rows[0], 'total') : 0;
  }
}

export class SqliteFavoriteRepository implements FavoriteRepository {
  constructor(private readonly db: SqlExecutor) {}

  async isFavorite(audioId: string): Promise<boolean> {
    const { rows } = await this.db.execute(
      'SELECT 1 AS found FROM favorites WHERE audio_id = ?',
      [audioId],
    );
    return rows.length > 0;
  }

  async setFavorite(audioId: string, favorite: boolean, nowIso: string): Promise<void> {
    if (favorite) {
      await this.db.execute(
        'INSERT INTO favorites (audio_id, created_at) VALUES (?, ?) ON CONFLICT (audio_id) DO NOTHING',
        [audioId, nowIso],
      );
    } else {
      await this.db.execute('DELETE FROM favorites WHERE audio_id = ?', [audioId]);
    }
  }
}
