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

  const captureError = (e: unknown, fallback: string) => {
    setError(e instanceof ApiError ? e.message : fallback);
    setErrorStatus(e instanceof ApiError ? e.status : null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      setData(await loaderRef.current());
    } catch (e) {
      captureError(e, 'Could not load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Pull-to-refresh: reloads without flipping the full-screen loading state. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await loaderRef.current());
      setError(null);
      setErrorStatus(null);
    } catch (e) {
      captureError(e, 'Could not refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
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

  return { data, loading, refreshing, error, errorStatus, reload: load, refresh };
}
