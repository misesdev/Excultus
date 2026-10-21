/** Typed key-value persistence for app preferences and small session state. */
export interface KeyValueRepository {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, nowIso: string): Promise<void>;
  delete(key: string): Promise<void>;
}
