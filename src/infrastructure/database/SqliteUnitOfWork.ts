import type { UnitOfWork } from '@core/application';
import type { SqlDatabase, SqlExecutor } from './SqlDatabase';

/** Builds repositories bound to the transaction executor for each unit of work. */
export class SqliteUnitOfWork<TScope> implements UnitOfWork<TScope> {
  constructor(
    private readonly db: SqlDatabase,
    private readonly scopeFactory: (executor: SqlExecutor) => TScope,
  ) {}

  run<T>(work: (scope: TScope) => Promise<T>): Promise<T> {
    return this.db.transaction(tx => work(this.scopeFactory(tx)));
  }
}
