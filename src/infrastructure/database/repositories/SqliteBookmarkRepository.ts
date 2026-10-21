import type {
  AudioBookmark,
  BookmarkRepository,
  BookmarkWithAudio,
} from '@features/bookmarks';
import { AUDIO_COLUMNS, mapAudio } from '../mappers/audioMappers';
import { readNumber, readOptionalString, readString, toSql } from '../rowReaders';
import type { SqlExecutor, SqlRow } from '../SqlDatabase';

function mapBookmark(row: SqlRow, prefix = ''): AudioBookmark {
  return {
    id: readString(row, `${prefix}id`),
    audioId: readString(row, `${prefix}audio_id`),
    positionMs: readNumber(row, `${prefix}position_ms`),
    title: readOptionalString(row, `${prefix}title`),
    note: readOptionalString(row, `${prefix}note`),
    createdAt: readString(row, `${prefix}created_at`),
  };
}

export class SqliteBookmarkRepository implements BookmarkRepository {
  constructor(private readonly db: SqlExecutor) {}

  async insert(bookmark: AudioBookmark): Promise<void> {
    await this.db.execute(
      'INSERT INTO bookmarks (id, audio_id, position_ms, title, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        bookmark.id,
        bookmark.audioId,
        bookmark.positionMs,
        toSql(bookmark.title),
        toSql(bookmark.note),
        bookmark.createdAt,
      ],
    );
  }

  async update(bookmark: AudioBookmark): Promise<void> {
    await this.db.execute('UPDATE bookmarks SET title = ?, note = ? WHERE id = ?', [
      toSql(bookmark.title),
      toSql(bookmark.note),
      bookmark.id,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM bookmarks WHERE id = ?', [id]);
  }

  async findById(id: string): Promise<AudioBookmark | null> {
    const { rows } = await this.db.execute('SELECT * FROM bookmarks WHERE id = ?', [id]);
    return rows[0] ? mapBookmark(rows[0]) : null;
  }

  async listForAudio(audioId: string): Promise<AudioBookmark[]> {
    const { rows } = await this.db.execute(
      'SELECT * FROM bookmarks WHERE audio_id = ? ORDER BY position_ms ASC',
      [audioId],
    );
    return rows.map(row => mapBookmark(row));
  }

  async listAll(): Promise<BookmarkWithAudio[]> {
    const { rows } = await this.db.execute(
      `SELECT b.id AS b_id, b.audio_id AS b_audio_id, b.position_ms AS b_position_ms,
              b.title AS b_title, b.note AS b_note, b.created_at AS b_created_at, ${AUDIO_COLUMNS}
       FROM bookmarks b JOIN audios a ON a.id = b.audio_id
       ORDER BY b.created_at DESC`,
    );
    return rows.map(row => ({ bookmark: mapBookmark(row, 'b_'), audio: mapAudio(row) }));
  }
}
