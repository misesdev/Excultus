import { open, type DB, type Transaction } from '@op-engineering/op-sqlite';
import type { SqlDriver, SqlExecutor, SqlResult, SqlValue } from './SqlDatabase';

function toResult(result: {
  rows: Array<Record<string, unknown>>;
  rowsAffected: number;
}): SqlResult {
  return { rows: result.rows, rowsAffected: result.rowsAffected };
}

function executorFor(target: DB | Transaction): SqlExecutor {
  return {
    async execute(sql: string, params: readonly SqlValue[] = []) {
      return toResult(await target.execute(sql, [...params]));
    },
  };
}

/** Adapter over op-sqlite (JSI, queries run off the UI thread). */
export class OpSqliteDriver implements SqlDriver {
  private readonly db: DB;

  constructor(name: string) {
    this.db = open({ name });
  }

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<SqlResult> {
    return toResult(await this.db.execute(sql, [...params]));
  }

  transaction(work: (tx: SqlExecutor) => Promise<void>): Promise<void> {
    return this.db.transaction(tx => work(executorFor(tx)));
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
