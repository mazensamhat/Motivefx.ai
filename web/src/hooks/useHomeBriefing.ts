import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { SITE_EMBED } from "../lib/siteSession";
import type { HomeBriefing } from "../types";

async function fetchEmbeddedBriefing(): Promise<HomeBriefing | null> {
  const res = await fetch("/api/backend/briefing", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { briefing?: HomeBriefing };
  return data.briefing ?? null;
}

export function useHomeBriefing(intervalMs = 60_000) {
  const [data, setData] = useState<HomeBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      if (SITE_EMBED) {
        const embedded = await fetchEmbeddedBriefing();
        if (embedded) {
          setData(embedded);
          setError(null);
          return;
        }
      }
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
