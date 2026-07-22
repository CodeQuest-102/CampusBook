import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../api';
import type { PagedResponse } from '../api/types';

/**
 * Infinite-scroll companion to {@link useApiData} for paginated endpoints.
 *
 * Loads page 0 on focus, appends further pages via {@link loadMore}, and maps
 * each raw item to a view model with `mapItem`. Refresh reloads from page 0.
 *
 * @param loadPage fetches one page (page index -> PagedResponse of raw items)
 * @param mapItem  maps a raw item to the shape the screen renders
 */
export function useApiList<Raw, T>(
  loadPage: (page: number) => Promise<PagedResponse<Raw>>,
  mapItem: (raw: Raw) => T,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Next page to request and whether more remain.
  const nextPage = useRef(0);
  const hasMore = useRef(true);

  // Keep the latest callbacks without making them focus-effect dependencies.
  const loadPageRef = useRef(loadPage);
  loadPageRef.current = loadPage;
  const mapItemRef = useRef(mapItem);
  mapItemRef.current = mapItem;

  const captureError = (e: unknown, fallback: string) => {
    setError(e instanceof ApiError ? e.message : fallback);
    setErrorStatus(e instanceof ApiError ? e.status : null);
  };

  /** Load page 0, replacing the list. Used on first focus and retry. */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const res = await loadPageRef.current(0);
      setItems(res.content.map(mapItemRef.current));
      nextPage.current = 1;
      hasMore.current = !res.last;
    } catch (e) {
      captureError(e, 'Could not load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Pull-to-refresh: reload page 0 without the full-screen loading state. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await loadPageRef.current(0);
      setItems(res.content.map(mapItemRef.current));
      nextPage.current = 1;
      hasMore.current = !res.last;
      setError(null);
      setErrorStatus(null);
    } catch (e) {
      captureError(e, 'Could not refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  /** Append the next page. No-op while already loading, refreshing, or exhausted. */
  const loadMore = useCallback(async () => {
    if (loadingMore || refreshing || loading || !hasMore.current) return;
    setLoadingMore(true);
    try {
      const res = await loadPageRef.current(nextPage.current);
      setItems((cur) => [...cur, ...res.content.map(mapItemRef.current)]);
      nextPage.current += 1;
      hasMore.current = !res.last;
    } catch (e) {
      // Keep what we have; surface the error so the footer can show a retry.
      captureError(e, 'Could not load more. Pull to refresh.');
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, refreshing]);

  /** Optimistic local update (e.g. mark-as-read) without a round-trip. */
  const patchItems = useCallback((updater: (items: T[]) => T[]) => {
    setItems(updater);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    error,
    errorStatus,
    hasMore: hasMore.current,
    reload: load,
    refresh,
    loadMore,
    patchItems,
  };
}
