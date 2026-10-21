import type {
  SqlDriver,
  SqlExecutor,
  SqlResult,
  SqlValue,
} from '@infrastructure/database/SqlDatabase';

interface StatementSync {
  all(...params: SqlValue[]): Array<Record<string, unknown>>;
  run(...params: SqlValue[]): { changes: number | bigint };
}

interface DatabaseSync {
  prepare(sql: string): StatementSync;
  exec(sql: string): void;
  close(): void;
}

type SqliteModule = { DatabaseSync: new (path: string) => DatabaseSync };

/**
 * Test-only driver backed by Node's built-in SQLite (same engine family as
 * op-sqlite, FTS5 included). Lets repository and migration tests run real SQL
 * without a device. Loaded via getBuiltinModule because Jest's resolver does
 * not know the "node:sqlite" scheme-only builtin.
 */
export class NodeSqliteDriver implements SqlDriver {
  private readonly db: DatabaseSync;

  constructor(path = ':memory:') {
    const nodeProcess = (
      globalThis as unknown as { process: { getBuiltinModule(id: string): unknown } }
    ).process;
    const sqlite = nodeProcess.getBuiltinModule('node:sqlite') as SqliteModule;
    this.db = new sqlite.DatabaseSync(path);
  }

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<SqlResult> {
    return this.run(sql, params);
  }

  async transaction(work: (tx: SqlExecutor) => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await work({ execute: async (sql, params = []) => this.run(sql, params) });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private run(sql: string, params: readonly SqlValue[]): SqlResult {
    const statement = this.db.prepare(sql);
    const isQuery = /^\s*(select|pragma|with)\b/i.test(sql) || /\breturning\b/i.test(sql);
    if (isQuery) {
      const rows = statement.all(...params).map(row => ({ ...row }));
      return { rows, rowsAffected: 0 };
    }
    const result = statement.run(...params);
    return { rows: [], rowsAffected: Number(result.changes) };
  }
}
