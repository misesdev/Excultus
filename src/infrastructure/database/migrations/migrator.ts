import type { Logger } from '@core/application';
import { DatabaseError } from '@core/errors';
import { readNumber } from '../rowReaders';
import type { SqlDatabase } from '../SqlDatabase';
import { MIGRATIONS, type Migration } from './migrations';

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const { rows } = await db.execute('PRAGMA user_version');
  return rows[0] ? readNumber(rows[0], 'user_version') : 0;
}

/**
 * Applies pending migrations, each inside its own transaction, and records
 * the version in PRAGMA user_version (atomically with the schema changes).
 */
export async function runMigrations(
  db: SqlDatabase,
  logger: Logger,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  const current = await getSchemaVersion(db);
  const latest = sorted[sorted.length - 1]?.version ?? 0;
  if (current > latest) {
    throw new DatabaseError('Database schema is newer than this app version', {
      details: { current, latest },
    });
  }
  for (const migration of sorted) {
    if (migration.version <= current) {
      continue;
    }
    await db.transaction(async tx => {
      for (const statement of migration.statements) {
        await tx.execute(statement);
      }
      // PRAGMA does not accept bound parameters; the version is a trusted integer.
      await tx.execute(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
    logger.info('database.migrated', {
      version: migration.version,
      name: migration.name,
    });
  }
  return getSchemaVersion(db);
}

/** Enables and verifies referential integrity for the connection. */
export async function enableForeignKeys(db: SqlDatabase): Promise<void> {
  await db.execute('PRAGMA foreign_keys = ON');
  const { rows } = await db.execute('PRAGMA foreign_keys');
  if (!rows[0] || readNumber(rows[0], 'foreign_keys') !== 1) {
    throw new DatabaseError('Foreign keys could not be enabled');
  }
}
