import type { Logger } from '@core/application';
import type { KeyValueRepository } from '@features/settings';
import { readString } from '../rowReaders';
import type { SqlExecutor } from '../SqlDatabase';

/** JSON values in the `settings` table. Corrupted values are reported and ignored. */
export class SqliteKeyValueRepository implements KeyValueRepository {
  constructor(private readonly db: SqlExecutor, private readonly logger: Logger) {}

  async get(key: string): Promise<unknown | undefined> {
    const { rows } = await this.db.execute('SELECT value FROM settings WHERE key = ?', [
      key,
    ]);
    if (!rows[0]) {
      return undefined;
    }
    try {
      return JSON.parse(readString(rows[0], 'value'));
    } catch (error) {
      this.logger.warn('settings.corrupted_value', { key }, error);
      return undefined;
    }
  }

  async set(key: string, value: unknown, nowIso: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, JSON.stringify(value), nowIso],
    );
  }

  async delete(key: string): Promise<void> {
    await this.db.execute('DELETE FROM settings WHERE key = ?', [key]);
  }
}
