import type { PageRequest } from '@core/types';
import type { AudioLibraryItem } from '@features/audios';
import type {
  LibraryFilter,
  LibraryQuery,
  LibrarySearchRepository,
  LibrarySort,
} from '@features/search';
import { buildFtsMatch, likePattern } from '../fts';
import { LIBRARY_ITEM_SELECT, mapLibraryItem } from '../mappers/audioMappers';
import type { SqlExecutor, SqlValue } from '../SqlDatabase';

const FILTER_CLAUSES: Record<LibraryFilter, string | null> = {
  all: null,
  downloaded: "d.status = 'completed'",
  'not-downloaded': "(d.status IS NULL OR d.status <> 'completed')",
  favorites: 'f.audio_id IS NOT NULL',
  'in-progress': 'p.completed = 0 AND p.position_ms > 0',
  completed: 'p.completed = 1',
};

const SORT_CLAUSES: Record<LibrarySort, string> = {
  title: 'a.title COLLATE NOCASE ASC',
  addedAt: 'a.created_at DESC',
  lastPlayed: 'p.last_played_at IS NULL, p.last_played_at DESC',
  duration: 'a.duration_ms IS NULL, a.duration_ms ASC',
};

/**
 * Paginated library search. Text matches the FTS5 index (title, artist,
 * album, description) plus collection names and the content origin.
 */
export class SqliteLibrarySearchRepository implements LibrarySearchRepository {
  constructor(private readonly db: SqlExecutor) {}

  async search(query: LibraryQuery, page: PageRequest): Promise<AudioLibraryItem[]> {
    const conditions: string[] = [];
    const params: SqlValue[] = [];

    const match = buildFtsMatch(query.text);
    if (match && query.text) {
      const pattern = likePattern(query.text);
      conditions.push(`(
        a.id IN (SELECT audio_id FROM audios_fts WHERE audios_fts MATCH ?)
        OR EXISTS (SELECT 1 FROM collection_audios ca JOIN collections c ON c.id = ca.collection_id
                   WHERE ca.audio_id = a.id AND c.name LIKE ? ESCAPE '\\')
        OR a.source_type LIKE ? ESCAPE '\\'
        OR a.source_url LIKE ? ESCAPE '\\'
      )`);
      params.push(match, pattern, pattern, pattern);
    }
    const filter = FILTER_CLAUSES[query.filter];
    if (filter) {
      conditions.push(filter);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.db.execute(
      `${LIBRARY_ITEM_SELECT} ${where} ORDER BY ${
        SORT_CLAUSES[query.sort]
      }, a.id LIMIT ? OFFSET ?`,
      [...params, page.limit, page.offset],
    );
    return rows.map(mapLibraryItem);
  }
}
