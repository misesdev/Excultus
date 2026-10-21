import type { AudioLibraryItem } from '@features/audios';
import type {
  Collection,
  CollectionItemsQuery,
  CollectionRepository,
  CollectionSortMode,
  CollectionSummary,
} from '@features/collections';
import { buildFtsMatch } from '../fts';
import { LIBRARY_ITEM_SELECT, mapLibraryItem } from '../mappers/audioMappers';
import { readNumber, readOptionalString, readString, toSql } from '../rowReaders';
import type { SqlExecutor, SqlRow, SqlValue } from '../SqlDatabase';
import {
  addMembers,
  removeMember,
  setMemberOrder,
  type MembershipTable,
} from './orderedMembership';

const MEMBERSHIP: MembershipTable = {
  table: 'collection_audios',
  ownerColumn: 'collection_id',
};

const ITEM_ORDER: Record<CollectionSortMode, string> = {
  custom: 'ca.position ASC',
  title: 'a.title COLLATE NOCASE ASC, ca.position ASC',
  addedAt: 'ca.added_at DESC, ca.position ASC',
  duration: 'a.duration_ms IS NULL, a.duration_ms ASC, ca.position ASC',
};

const SUMMARY_SELECT = `SELECT c.id, c.name, c.description, c.artwork_path, c.sort_mode,
  c.created_at, c.updated_at,
  COUNT(ca.audio_id) AS audio_count,
  COALESCE(SUM(a.duration_ms), 0) AS total_duration,
  COALESCE(SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END), 0) AS offline_count,
  COALESCE(SUM(CASE WHEN p.completed = 1 THEN COALESCE(a.duration_ms, 0)
    ELSE MIN(COALESCE(p.position_ms, 0), COALESCE(a.duration_ms, 0)) END), 0) AS listened_ms
FROM collections c
LEFT JOIN collection_audios ca ON ca.collection_id = c.id
LEFT JOIN audios a ON a.id = ca.audio_id
LEFT JOIN downloads d ON d.audio_id = a.id
LEFT JOIN playback_progress p ON p.audio_id = a.id`;

function mapCollection(row: SqlRow): Collection {
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    description: readOptionalString(row, 'description'),
    artworkPath: readOptionalString(row, 'artwork_path'),
    sortMode: readString(row, 'sort_mode') as CollectionSortMode,
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function mapSummary(row: SqlRow): CollectionSummary {
  return {
    collection: mapCollection(row),
    audioCount: readNumber(row, 'audio_count'),
    totalDurationMs: readNumber(row, 'total_duration'),
    offlineCount: readNumber(row, 'offline_count'),
    listenedMs: readNumber(row, 'listened_ms'),
  };
}

export class SqliteCollectionRepository implements CollectionRepository {
  constructor(private readonly db: SqlExecutor) {}

  async listSummaries(): Promise<CollectionSummary[]> {
    const { rows } = await this.db.execute(
      `${SUMMARY_SELECT} GROUP BY c.id ORDER BY c.updated_at DESC`,
    );
    return rows.map(mapSummary);
  }

  async findById(id: string): Promise<Collection | null> {
    const { rows } = await this.db.execute('SELECT * FROM collections WHERE id = ?', [
      id,
    ]);
    return rows[0] ? mapCollection(rows[0]) : null;
  }

  async findSummary(id: string): Promise<CollectionSummary | null> {
    const { rows } = await this.db.execute(
      `${SUMMARY_SELECT} WHERE c.id = ? GROUP BY c.id`,
      [id],
    );
    return rows[0] ? mapSummary(rows[0]) : null;
  }

  async insert(collection: Collection): Promise<void> {
    await this.db.execute(
      `INSERT INTO collections (id, name, description, artwork_path, sort_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        collection.id,
        collection.name,
        toSql(collection.description),
        toSql(collection.artworkPath),
        collection.sortMode,
        collection.createdAt,
        collection.updatedAt,
      ],
    );
  }

  async update(collection: Collection): Promise<void> {
    await this.db.execute(
      `UPDATE collections SET name = ?, description = ?, artwork_path = ?, sort_mode = ?, updated_at = ?
       WHERE id = ?`,
      [
        collection.name,
        toSql(collection.description),
        toSql(collection.artworkPath),
        collection.sortMode,
        collection.updatedAt,
        collection.id,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM collections WHERE id = ?', [id]);
  }

  addAudios(
    collectionId: string,
    audioIds: readonly string[],
    nowIso: string,
  ): Promise<number> {
    return addMembers(this.db, MEMBERSHIP, collectionId, audioIds, nowIso);
  }

  removeAudio(collectionId: string, audioId: string): Promise<void> {
    return removeMember(this.db, MEMBERSHIP, collectionId, audioId);
  }

  setOrder(collectionId: string, orderedAudioIds: readonly string[]): Promise<void> {
    return setMemberOrder(this.db, MEMBERSHIP, collectionId, orderedAudioIds);
  }

  async listItems(
    collectionId: string,
    query: CollectionItemsQuery,
  ): Promise<AudioLibraryItem[]> {
    const params: SqlValue[] = [collectionId];
    let textFilter = '';
    const match = buildFtsMatch(query.text);
    if (match) {
      textFilter =
        'AND a.id IN (SELECT audio_id FROM audios_fts WHERE audios_fts MATCH ?)';
      params.push(match);
    }
    const { rows } = await this.db.execute(
      `${LIBRARY_ITEM_SELECT}
       JOIN collection_audios ca ON ca.audio_id = a.id
       WHERE ca.collection_id = ? ${textFilter}
       ORDER BY ${ITEM_ORDER[query.sort]}`,
      params,
    );
    return rows.map(mapLibraryItem);
  }

  async listAudioIds(collectionId: string, sort: CollectionSortMode): Promise<string[]> {
    const { rows } = await this.db.execute(
      `SELECT a.id FROM audios a JOIN collection_audios ca ON ca.audio_id = a.id
       WHERE ca.collection_id = ? ORDER BY ${ITEM_ORDER[sort]}`,
      [collectionId],
    );
    return rows.map(row => readString(row, 'id'));
  }

  async findExclusiveAudioIds(collectionId: string): Promise<string[]> {
    const { rows } = await this.db.execute(
      `SELECT ca.audio_id FROM collection_audios ca
       WHERE ca.collection_id = ?
         AND NOT EXISTS (SELECT 1 FROM collection_audios other
                         WHERE other.audio_id = ca.audio_id AND other.collection_id <> ca.collection_id)
         AND NOT EXISTS (SELECT 1 FROM playlist_audios pa WHERE pa.audio_id = ca.audio_id)`,
      [collectionId],
    );
    return rows.map(row => readString(row, 'audio_id'));
  }

  async findCollectionIdsForAudio(audioId: string): Promise<string[]> {
    const { rows } = await this.db.execute(
      'SELECT collection_id FROM collection_audios WHERE audio_id = ?',
      [audioId],
    );
    return rows.map(row => readString(row, 'collection_id'));
  }
}
