import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";
export function useApi<T>(path: string, intervalMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const currentPath = useRef(path); currentPath.current = path;
  const epoch = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (!path) return;
    if (inFlight.current) return inFlight.current;
    const ticket = epoch.current;
    const request = (async () => {
      try {
        const result = await apiGet<T>(path);
        if (ticket !== epoch.current || currentPath.current !== path) return;
        setData(result); setError(null);
        window.dispatchEvent(new CustomEvent("motivefx:feed-health", { detail: { path, error: null } }));
      } catch (e) {
        if (ticket === epoch.current && currentPath.current === path) {
          const message = e instanceof Error ? e.message : "Could not load data. Retry.";
          setError(message);
          window.dispatchEvent(new CustomEvent("motivefx:feed-health", { detail: { path, error: message } }));
        }
      } finally { if (ticket === epoch.current) setLoading(false); }
    })();
    inFlight.current = request;
    try { await request; } finally { if (inFlight.current === request) inFlight.current = null; }
  }, [path]);
  useEffect(() => {
    epoch.current++; inFlight.current = null;
    setData(null); setError(null); setLoading(!!path);
    void refresh();
    const retry = (event: Event) => { const selected = (event as CustomEvent<{ path?: string }>).detail?.path; if (!selected || selected === path) void refresh(); };
    window.addEventListener("motivefx:retry-feed", retry);
    const timer = intervalMs > 0 ? setInterval(() => { if (document.visibilityState !== "hidden") void refresh(); }, intervalMs) : null;
    return () => { epoch.current++; if (timer) clearInterval(timer);
      window.removeEventListener("motivefx:retry-feed", retry);
      window.dispatchEvent(new CustomEvent("motivefx:feed-health", { detail: { path, error: null } }));
    };
  }, [path, intervalMs, refresh]);
  return { data, loading, error, refresh };
}
