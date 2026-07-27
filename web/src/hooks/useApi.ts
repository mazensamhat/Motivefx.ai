import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";

export function useApi<T>(path: string, intervalMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef(0);
  const pathRef = useRef(path);
  pathRef.current = path;

  const refresh = useCallback(async () => {
    const currentPath = pathRef.current;
    if (!currentPath) {
      setLoading(false);
      return;
    }
    try {
      const result = await apiGet<T>(currentPath);
      setData(result);
      setError(null);
      retryRef.current = 0;
      setLoading(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      if (/still loading|busy|timed out|timeout/i.test(msg) && retryRef.current < 1) {
        retryRef.current += 1;
        window.setTimeout(() => {
          void refresh();
        }, 1800);
        return;
      }
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    retryRef.current = 0;
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs, path]);

  return { data, loading, error, refresh };
}
