import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../api';

/**
 * Loads data from the API when the screen gains focus (covers first mount and
 * re-focus, so lists refresh when you navigate back). Returns loading/error
 * state plus a manual `reload`.
 */
export function useApiData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // HTTP status of the last error (e.g. 402), so screens can special-case it.
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Keep the latest loader without making it a focus-effect dependency.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // Bumped by every load()/refresh() call. A response only gets applied if
  // its id is still the latest one — otherwise a newer call (e.g. from a
  // rapid refocus) has already superseded it, and applying an out-of-order
  // response here would silently overwrite fresher state with stale data.
  const requestIdRef = useRef(0);

  const captureError = (e: unknown, fallback: string) => {
    setError(e instanceof ApiError ? e.message : fallback);
    setErrorStatus(e instanceof ApiError ? e.status : null);
  };

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const result = await loaderRef.current();
      if (requestId !== requestIdRef.current) return;
      setData(result);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      captureError(e, 'Could not load data. Please try again.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  /** Pull-to-refresh: reloads without flipping the full-screen loading state. */
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    try {
      const result = await loaderRef.current();
      if (requestId !== requestIdRef.current) return;
      setData(result);
      setError(null);
      setErrorStatus(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      captureError(e, 'Could not refresh. Please try again.');
    } finally {
      if (requestId === requestIdRef.current) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { data, loading, refreshing, error, errorStatus, reload: load, refresh };
}
