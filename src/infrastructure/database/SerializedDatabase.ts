import { DatabaseError, toAppError } from '@core/errors';
import type {
  SqlDatabase,
  SqlDriver,
  SqlExecutor,
  SqlResult,
  SqlValue,
} from './SqlDatabase';

/**
 * SQLite uses a single connection, so statements issued while a transaction
 * is open would silently become part of it. This wrapper runs every
 * statement and transaction through a FIFO queue: outside work waits for the
 * transaction to finish, while code inside the transaction uses `tx`.
 */
export class SerializedDatabase implements SqlDatabase {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly driver: SqlDriver) {}

  execute(sql: string, params: readonly SqlValue[] = []): Promise<SqlResult> {
    return this.enqueue(() => this.driver.execute(sql, params), sql);
  }

  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      let result: T | undefined;
      await this.driver.transaction(async tx => {
        result = await work(tx);
      });
      return result as T;
    }, 'transaction');
  }

  close(): Promise<void> {
    return this.enqueue(() => this.driver.close(), 'close');
  }

  private enqueue<T>(task: () => Promise<T>, label: string): Promise<T> {
    const run = async () => {
      try {
        return await task();
      } catch (error) {
        const appError = toAppError(error);
        throw appError.code === 'unknown'
          ? new DatabaseError(`SQLite failure: ${appError.message}`, {
              cause: error,
              details: { statement: label.slice(0, 80) },
            })
          : appError;
      }
    };
    const result = this.tail.then(run, run);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
