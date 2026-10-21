import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import type { DataTopic } from '@core/application';
import { getUserMessage } from '@core/errors';
import type { Page, PageRequest } from '@core/types';

export const DEFAULT_PAGE_SIZE = 40;

export interface PaginatedState<T> {
  items: T[];
  error: string | undefined;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Infinite list backed by LIMIT/OFFSET queries so large libraries are never
 * loaded into memory at once. Invalidation reloads the pages already shown.
 */
export function usePaginatedQuery<T>(
  fetchPage: (page: PageRequest) => Promise<Page<T>>,
  deps: readonly unknown[],
  topics: readonly DataTopic[],
  pageSize = DEFAULT_PAGE_SIZE,
): PaginatedState<T> {
  const { events, logger } = useDependencies();
  const isFocused = useIsFocused();
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);
  const stale = useRef(false);
  const loaded = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const reload = useCallback(
    (mode: 'initial' | 'refresh' | 'silent') => {
      const id = ++requestId.current;
      if (mode === 'initial') {
        setLoading(true);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      }
      const limit = Math.max(pageSize, mode === 'initial' ? pageSize : loaded.current);
      fetchRef
        .current({ limit, offset: 0 })
        .then(page => {
          if (id === requestId.current) {
            loaded.current = page.items.length;
            setItems(page.items);
            setHasMore(page.hasMore);
            setError(undefined);
          }
        })
        .catch(cause => {
          logger.error('paginated_query.failed', {}, cause);
          if (id === requestId.current) {
            setError(getUserMessage(cause));
          }
        })
        .finally(() => {
          if (id === requestId.current) {
            setLoading(false);
            setRefreshing(false);
          }
        });
    },
    [logger, pageSize],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) {
      return;
    }
    const id = requestId.current;
    setLoadingMore(true);
    fetchRef
      .current({ limit: pageSize, offset: loaded.current })
      .then(page => {
        if (id === requestId.current) {
          loaded.current += page.items.length;
          setItems(previous => [...previous, ...page.items]);
          setHasMore(page.hasMore);
        }
      })
      .catch(cause => {
        logger.error('paginated_query.load_more_failed', {}, cause);
        setError(getUserMessage(cause));
      })
      .finally(() => setLoadingMore(false));
  }, [hasMore, loading, loadingMore, logger, pageSize]);

  useEffect(() => {
    loaded.current = 0;
    reload('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const topicsKey = topics.join('|');
  useEffect(() => {
    return events.subscribe(topicsKey.split('|') as DataTopic[], () => {
      if (isFocused) {
        reload('silent');
      } else {
        stale.current = true;
      }
    });
  }, [events, topicsKey, isFocused, reload]);

  useEffect(() => {
    if (isFocused && stale.current) {
      stale.current = false;
      reload('silent');
    }
  }, [isFocused, reload]);

  const refetch = useCallback(() => reload('refresh'), [reload]);
  return { items, error, loading, loadingMore, refreshing, hasMore, loadMore, refetch };
}
