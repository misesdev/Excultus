export interface PageRequest {
  limit: number;
  offset: number;
}

export interface Page<T> {
  items: T[];
  /** True when more items may be fetched with a larger offset. */
  hasMore: boolean;
}
