import { ValidationError } from '@core/errors';
import { readNumber, readString } from '../rowReaders';
import type { SqlExecutor } from '../SqlDatabase';
import { chunk, inTransaction } from '../transactions';

/**
 * Shared implementation of an ordered many-to-many membership table
 * (collection_audios / playlist_audios). Table and column names are
 * compile-time constants, never user input.
 */
export interface MembershipTable {
  table: 'collection_audios' | 'playlist_audios';
  ownerColumn: 'collection_id' | 'playlist_id';
}

const ROWS_PER_INSERT = 200;

export async function addMembers(
  db: SqlExecutor,
  { table, ownerColumn }: MembershipTable,
  ownerId: string,
  audioIds: readonly string[],
  nowIso: string,
): Promise<number> {
  return inTransaction(db, async tx => {
    const { rows } = await tx.execute(
      `SELECT audio_id FROM ${table} WHERE ${ownerColumn} = ?`,
      [ownerId],
    );
    const existing = new Set(rows.map(row => readString(row, 'audio_id')));
    const toAdd = [...new Set(audioIds)].filter(id => !existing.has(id));
    if (toAdd.length === 0) {
      return 0;
    }
    const max = await tx.execute(
      `SELECT COALESCE(MAX(position), -1) AS max_position FROM ${table} WHERE ${ownerColumn} = ?`,
      [ownerId],
    );
    let position = (max.rows[0] ? readNumber(max.rows[0], 'max_position') : -1) + 1;
    for (const group of chunk(toAdd, ROWS_PER_INSERT)) {
      const values = group.map(() => '(?, ?, ?, ?)').join(', ');
      const params = group.flatMap(audioId => [ownerId, audioId, position++, nowIso]);
      await tx.execute(
        `INSERT INTO ${table} (${ownerColumn}, audio_id, position, added_at) VALUES ${values}`,
        params,
      );
    }
    return toAdd.length;
  });
}

export async function removeMember(
  db: SqlExecutor,
  { table, ownerColumn }: MembershipTable,
  ownerId: string,
  audioId: string,
): Promise<void> {
  await db.execute(`DELETE FROM ${table} WHERE ${ownerColumn} = ? AND audio_id = ?`, [
    ownerId,
    audioId,
  ]);
}

/** Rewrites positions 0..n-1; the ordered list must contain exactly the current members. */
export async function setMemberOrder(
  db: SqlExecutor,
  { table, ownerColumn }: MembershipTable,
  ownerId: string,
  orderedAudioIds: readonly string[],
): Promise<void> {
  await inTransaction(db, async tx => {
    const { rows } = await tx.execute(
      `SELECT audio_id FROM ${table} WHERE ${ownerColumn} = ?`,
      [ownerId],
    );
    const members = new Set(rows.map(row => readString(row, 'audio_id')));
    const ordered = new Set(orderedAudioIds);
    if (
      ordered.size !== orderedAudioIds.length ||
      ordered.size !== members.size ||
      ![...ordered].every(id => members.has(id))
    ) {
      throw new ValidationError('Order must contain every member exactly once', 'order');
    }
    for (const [position, audioId] of orderedAudioIds.entries()) {
      await tx.execute(
        `UPDATE ${table} SET position = ? WHERE ${ownerColumn} = ? AND audio_id = ?`,
        [position, ownerId, audioId],
      );
    }
  });
}
