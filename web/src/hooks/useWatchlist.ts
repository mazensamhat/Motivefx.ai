import { useCallback } from "react";
import { apiDelete, apiPost } from "../lib/api";
import { useAuth } from "./useAuth";
import { useSavedRows } from "./useSavedRows";
import type { WatchlistItem } from "../types";

export function useWatchlist() {
  const { isAuthenticated, user } = useAuth();
  const owner = isAuthenticated ? user?.userId ?? "" : "";
  const ledger = useSavedRows<WatchlistItem>(owner ? `/home/watchlist/${owner}` : "", "items", owner, "watchlist");

  const addItem = useCallback(
    async (module: string, symbol: string) => {
      if (!owner) throw new Error("Sign in to update your radar.");
      const data = await apiPost<{ items: WatchlistItem[] }>("/home/watchlist", {
        user_id: owner,
        module,
        symbol: symbol.toUpperCase().trim(),
      });
      if (!Array.isArray(data.items)) throw new Error("Radar update could not be confirmed. Retry to refresh.");
      ledger.setRows(data.items);
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
      return true;
    },
    [owner, ledger.setRows]
  );

  const removeItem = useCallback(async (module: string, symbol: string) => {
    if (!owner) throw new Error("Sign in to update your radar.");
    const data = await apiDelete<{ items: WatchlistItem[] }>(
      `/home/watchlist/${owner}/${module}/${encodeURIComponent(symbol)}`
    );
    if (!Array.isArray(data.items)) throw new Error("Radar update could not be confirmed. Retry to refresh.");
    ledger.setRows(data.items);
    window.dispatchEvent(new Event("motivefx:briefing-refresh"));
  }, [owner, ledger.setRows]);

  return { items: ledger.rows, loading: ledger.loading, error: ledger.error, verified: ledger.verified, refresh: ledger.reload, addItem, removeItem };
}
