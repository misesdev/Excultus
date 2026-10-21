export type SqlValue = string | number | null;
export type SqlRow = Record<string, unknown>;

export interface SqlResult {
  rows: SqlRow[];
  rowsAffected: number;
}

export interface SqlExecutor {
  execute(sql: string, params?: readonly SqlValue[]): Promise<SqlResult>;
}

export interface SqlDatabase extends SqlExecutor {
  /** Runs `work` inside BEGIN/COMMIT; any error rolls the transaction back. */
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Raw driver contract (op-sqlite in the app, node:sqlite in tests). */
export interface SqlDriver {
  execute(sql: string, params?: readonly SqlValue[]): Promise<SqlResult>;
  transaction(work: (tx: SqlExecutor) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}
