import type { Logger } from '@core/application';
import { enableForeignKeys, runMigrations } from './migrations/migrator';
import { SerializedDatabase } from './SerializedDatabase';
import type { SqlDatabase, SqlDriver } from './SqlDatabase';

export const DATABASE_NAME = 'excultus.db';

/** Opens, configures and migrates the database on top of any driver. */
export async function prepareDatabase(
  driver: SqlDriver,
  logger: Logger,
): Promise<SqlDatabase> {
  const db = new SerializedDatabase(driver);
  await db.execute('PRAGMA journal_mode = WAL');
  await enableForeignKeys(db);
  const version = await runMigrations(db, logger);
  logger.info('database.ready', { version });
  return db;
}
