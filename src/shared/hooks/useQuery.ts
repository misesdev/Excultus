import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useDependencies } from '@app/dependency-injection/DependenciesContext';
import type { DataTopic } from '@core/application';
import { getUserMessage } from '@core/errors';

export interface QueryState<T> {
  data: T | undefined;
  /** Friendly message; technical details are logged, never shown. */
  error: string | undefined;
  loading: boolean;
  refreshing: boolean;
  refetch: () => void;
}

/**
 * Loads data from a use case and keeps it fresh: it refetches when one of
 * `topics` changes. Changes that happen while the screen is unfocused only
 * mark the data stale, and the refetch happens when the screen regains focus.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
  topics: readonly DataTopic[],
): QueryState<T> {
  const { events, logger } = useDependencies();
  const isFocused = useIsFocused();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const stale = useRef(false);
  const requestId = useRef(0);
  const hasData = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(
    (mode: 'initial' | 'refresh' | 'silent') => {
      const id = ++requestId.current;
      if (mode === 'initial' && !hasData.current) {
        setLoading(true);
      }
      if (mode === 'refresh') {
        setRefreshing(true);
      }
      fetcherRef
        .current()
        .then(result => {
          if (id === requestId.current) {
            hasData.current = true;
            setData(result);
            setError(undefined);
          }
        })
        .catch(cause => {
          logger.error('query.failed', {}, cause);
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
    [logger],
  );

  // Initial load and reload when inputs change.
  useEffect(() => {
    load('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const topicsKey = topics.join('|');
  useEffect(() => {
    return events.subscribe(topicsKey.split('|') as DataTopic[], () => {
      stale.current = true;
      if (isFocused) {
        stale.current = false;
        load('silent');
      }
    });
  }, [events, topicsKey, isFocused, load]);

  useEffect(() => {
    if (isFocused && stale.current) {
      stale.current = false;
      load('silent');
    }
  }, [isFocused, load]);

  const refetch = useCallback(() => load('refresh'), [load]);
  return { data, error, loading, refreshing, refetch };
}
