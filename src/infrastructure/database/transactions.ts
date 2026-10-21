import type { SqlExecutor } from './SqlDatabase';

type MaybeTransactional = SqlExecutor & {
  transaction?: <T>(work: (tx: SqlExecutor) => Promise<T>) => Promise<T>;
};

/**
 * Runs multi-statement repository operations atomically. When the repository
 * is already bound to a transaction (unit of work), the work joins it.
 */
export function inTransaction<T>(
  db: SqlExecutor,
  work: (tx: SqlExecutor) => Promise<T>,
): Promise<T> {
  const candidate = db as MaybeTransactional;
  return candidate.transaction ? candidate.transaction(work) : work(db);
}

/** Splits rows so multi-row statements stay under SQLite's bound-parameter limit. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
