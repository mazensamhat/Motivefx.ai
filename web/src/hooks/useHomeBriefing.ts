import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { HomeBriefing } from "../types";

export function useHomeBriefing(intervalMs = 60_000) {
  const [data, setData] = useState<HomeBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await apiGet<HomeBriefing>("/home/briefing");
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, loading, error, refresh };
}
