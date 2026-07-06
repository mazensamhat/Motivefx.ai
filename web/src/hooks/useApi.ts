import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export function useApi<T>(path: string, intervalMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    try {
      const result = await apiGet<T>(path);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs, path]);

  return { data, loading, error, refresh };
}
