import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost, getUserId, hasAuthSession } from "../lib/api";
import type { WatchlistItem } from "../types";

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!hasAuthSession()) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<{ items: WatchlistItem[] }>(`/home/watchlist/${getUserId()}`);
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onAuth = () => refresh();
    window.addEventListener("motivefx:auth-changed", onAuth);
    return () => window.removeEventListener("motivefx:auth-changed", onAuth);
  }, [refresh]);

  const addItem = useCallback(
    async (module: string, symbol: string) => {
      if (!hasAuthSession()) return false;
      const data = await apiPost<{ items: WatchlistItem[] }>("/home/watchlist", {
        user_id: getUserId(),
        module,
        symbol: symbol.toUpperCase().trim(),
      });
      setItems(data.items ?? []);
      return true;
    },
    []
  );

  const removeItem = useCallback(async (module: string, symbol: string) => {
    if (!hasAuthSession()) return;
    const data = await apiDelete<{ items: WatchlistItem[] }>(
      `/home/watchlist/${getUserId()}/${module}/${encodeURIComponent(symbol)}`
    );
    setItems(data.items ?? []);
  }, []);

  return { items, loading, refresh, addItem, removeItem };
}
