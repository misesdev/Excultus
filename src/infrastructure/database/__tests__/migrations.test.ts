/**
 * @jest-environment node
 */
import { NodeSqliteDriver } from '@test/support/NodeSqliteDriver';
import { silentLogger } from '@test/support/fakes';
import { createTestDatabase } from '@test/support/testDatabase';
import {
  enableForeignKeys,
  getSchemaVersion,
  runMigrations,
} from '../migrations/migrator';
import { MIGRATIONS } from '../migrations/migrations';
import { SerializedDatabase } from '../SerializedDatabase';

describe('database migrations', () => {
  it('migrates an empty database to the latest version', async () => {
    const db = await createTestDatabase();
    const latest = MIGRATIONS[MIGRATIONS.length - 1]?.version;
    expect(await getSchemaVersion(db)).toBe(latest);

    const { rows } = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const tables = rows.map(row => row.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'collections',
        'audios',
        'collection_audios',
        'playlists',
        'playlist_audios',
        'playback_progress',
        'downloads',
        'bookmarks',
        'favorites',
        'playback_history',
        'settings',
        'audios_fts',
      ]),
    );
  });

  it('is idempotent when run again', async () => {
    const db = await createTestDatabase();
    const before = await getSchemaVersion(db);
    expect(await runMigrations(db, silentLogger)).toBe(before);
  });

  it('applies only pending migrations and rolls back a failing one', async () => {
    const db = new SerializedDatabase(new NodeSqliteDriver());
    await runMigrations(db, silentLogger);
    const broken = [
      ...MIGRATIONS,
      {
        version: 99,
        name: 'broken',
        statements: ['CREATE TABLE ok_table (id TEXT)', 'NOT VALID SQL'],
      },
    ];
    await expect(runMigrations(db, silentLogger, broken)).rejects.toMatchObject({
      code: 'database',
    });
    expect(await getSchemaVersion(db)).toBe(1);
    const { rows } = await db.execute(
      "SELECT name FROM sqlite_master WHERE name = 'ok_table'",
    );
    expect(rows).toHaveLength(0);
  });

  it('refuses to open a schema newer than the app', async () => {
    const db = new SerializedDatabase(new NodeSqliteDriver());
    await db.execute('PRAGMA user_version = 500');
    await expect(runMigrations(db, silentLogger)).rejects.toMatchObject({
      code: 'database',
    });
  });

  it('enables foreign keys and enforces referential integrity', async () => {
    const db = await createTestDatabase();
    await enableForeignKeys(db);
    await expect(
      db.execute(
        "INSERT INTO collection_audios (collection_id, audio_id, position, added_at) VALUES ('x', 'y', 0, 'now')",
      ),
    ).rejects.toMatchObject({ code: 'database' });
  });

  it('enforces check constraints', async () => {
    const db = await createTestDatabase();
    await expect(
      db.execute(
        "INSERT INTO audios (id, title, source_type, created_at, updated_at) VALUES ('a', '  ', 'archive', 'n', 'n')",
      ),
    ).rejects.toMatchObject({ code: 'database' });
    await expect(
      db.execute(
        "INSERT INTO audios (id, title, source_type, created_at, updated_at) VALUES ('a', 'x', 'ftp', 'n', 'n')",
      ),
    ).rejects.toMatchObject({ code: 'database' });
  });
});
