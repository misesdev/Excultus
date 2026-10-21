/**
 * Runs a unit of work atomically. `TScope` exposes repositories bound to the
 * same transaction; if `work` throws, every change is rolled back.
 */
export interface UnitOfWork<TScope> {
  run<T>(work: (scope: TScope) => Promise<T>): Promise<T>;
}
