import { prepareDatabase } from '@infrastructure/database/openDatabase';
import type { SqlDatabase } from '@infrastructure/database/SqlDatabase';
import { NodeSqliteDriver } from './NodeSqliteDriver';
import { silentLogger } from './fakes';

/** Fresh, fully migrated in-memory database. */
export function createTestDatabase(): Promise<SqlDatabase> {
  return prepareDatabase(new NodeSqliteDriver(), silentLogger);
}
