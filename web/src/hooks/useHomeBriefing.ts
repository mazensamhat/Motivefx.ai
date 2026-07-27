import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { HomeBriefing } from "../types";

export function useHomeBriefing(intervalMs = 60_000) {
  const [data, setData] = useState<HomeBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await apiGet<HomeBriefing>("/home/briefing");
      setData(result);
      setError(null);
    } catch (e) {
      // Keep last good briefing on screen — don't wipe the home desk.
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, intervalMs);
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener("motivefx:briefing-refresh", onRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("motivefx:briefing-refresh", onRefresh);
    };
  }, [refresh, intervalMs]);

  return { data, loading, error, refreshing, refresh };
}
