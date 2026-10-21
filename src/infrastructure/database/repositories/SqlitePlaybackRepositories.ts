import type { PageRequest } from '@core/types';
import type { AudioLibraryItem } from '@features/audios';
import {
  HISTORY_DEDUPE_WINDOW_MS,
  type HistoryListEntry,
  type HistoryRepository,
} from '@features/history';
import type {
  PlaybackHistoryRecorder,
  PlaybackProgress,
  PlaybackProgressRepository,
} from '@features/player';
import { LIBRARY_ITEM_SELECT, mapLibraryItem } from '../mappers/audioMappers';
import {
  readBoolean,
  readNumber,
  readOptionalNumber,
  readString,
  toSql,
} from '../rowReaders';
import type { SqlExecutor } from '../SqlDatabase';
import { inTransaction } from '../transactions';

export class SqlitePlaybackProgressRepository implements PlaybackProgressRepository {
  constructor(private readonly db: SqlExecutor) {}

  async find(audioId: string): Promise<PlaybackProgress | null> {
    const { rows } = await this.db.execute(
      'SELECT * FROM playback_progress WHERE audio_id = ?',
      [audioId],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      audioId: readString(row, 'audio_id'),
      positionMs: readNumber(row, 'position_ms'),
      durationMs: readOptionalNumber(row, 'duration_ms'),
      completed: readBoolean(row, 'completed'),
      lastPlayedAt: readString(row, 'last_played_at'),
    };
  }

  async save(progress: PlaybackProgress): Promise<void> {
    await this.db.execute(
      `INSERT INTO playback_progress (audio_id, position_ms, duration_ms, completed, last_played_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (audio_id) DO UPDATE SET position_ms = excluded.position_ms,
         duration_ms = COALESCE(excluded.duration_ms, playback_progress.duration_ms),
         completed = excluded.completed, last_played_at = excluded.last_played_at`,
      [
        progress.audioId,
        progress.positionMs,
        toSql(progress.durationMs),
        toSql(progress.completed),
        progress.lastPlayedAt,
      ],
    );
  }

  async delete(audioId: string): Promise<void> {
    await this.db.execute('DELETE FROM playback_progress WHERE audio_id = ?', [audioId]);
  }
}

export class SqliteHistoryRepository
  implements HistoryRepository, PlaybackHistoryRecorder
{
  constructor(private readonly db: SqlExecutor) {}

  record(audioId: string, positionMs: number, nowIso: string): Promise<void> {
    return inTransaction(this.db, async tx => {
      const { rows } = await tx.execute(
        'SELECT id, audio_id, played_at FROM playback_history ORDER BY played_at DESC, id DESC LIMIT 1',
      );
      const latest = rows[0];
      const sameRecentAudio =
        latest &&
        readString(latest, 'audio_id') === audioId &&
        Date.parse(nowIso) - Date.parse(readString(latest, 'played_at')) <
          HISTORY_DEDUPE_WINDOW_MS;
      if (latest && sameRecentAudio) {
        await tx.execute(
          'UPDATE playback_history SET played_at = ?, position_ms = ? WHERE id = ?',
          [nowIso, Math.round(positionMs), readNumber(latest, 'id')],
        );
        return;
      }
      await tx.execute(
        'INSERT INTO playback_history (audio_id, played_at, position_ms) VALUES (?, ?, ?)',
        [audioId, nowIso, Math.round(positionMs)],
      );
    });
  }

  async listRecent(page: PageRequest): Promise<HistoryListEntry[]> {
    const { rows } = await this.db.execute(
      `SELECT h.id AS h_id, h.played_at AS h_played_at, h.position_ms AS h_position_ms, sub.*
       FROM playback_history h
       JOIN (${LIBRARY_ITEM_SELECT}) sub ON sub.id = h.audio_id
       ORDER BY h.played_at DESC, h.id DESC LIMIT ? OFFSET ?`,
      [page.limit, page.offset],
    );
    return rows.map(row => ({
      entry: {
        id: readNumber(row, 'h_id'),
        audioId: readString(row, 'id'),
        playedAt: readString(row, 'h_played_at'),
        positionMs: readNumber(row, 'h_position_ms'),
      },
      item: mapLibraryItem(row),
    }));
  }

  async listInProgress(limit: number): Promise<AudioLibraryItem[]> {
    const { rows } = await this.db.execute(
      `${LIBRARY_ITEM_SELECT}
       WHERE p.completed = 0 AND p.position_ms > 0
       ORDER BY p.last_played_at DESC LIMIT ?`,
      [limit],
    );
    return rows.map(mapLibraryItem);
  }

  async clear(): Promise<void> {
    await this.db.execute('DELETE FROM playback_history');
  }
}
