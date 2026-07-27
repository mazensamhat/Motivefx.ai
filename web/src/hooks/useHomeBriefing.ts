import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { HomeBriefing } from "../types";

/** Instant shell so Home never blanks when the API is slow or the pool is warm. */
function localFallbackBriefing(): HomeBriefing {
  const now = new Date();
  const hour = now.getUTCHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return {
    greeting: `Good ${period}`,
    tagline: "The AI Command Center for Market Intelligence",
    motivfxScore: 62,
    stars: 3,
    marketConfidence: "MODERATE",
    opportunityCount: 0,
    highRiskAlerts: 0,
    portfolioDelta: null,
    biggestRisk: "Feeds warming up",
    biggestOpportunity: "Scanning…",
    topAiTip: "Live desks are refreshing — retry in a moment.",
    moduleSummaries: [
      { module: "trades", label: "Trades", count: 0, tab: "stocks", newSignals: 0 },
      { module: "penny", label: "Pink Slips", count: 0, tab: "penny", newSignals: 0 },
      { module: "crypto", label: "Crypto", count: 0, tab: "crypto", newSignals: 0 },
      { module: "betting", label: "Betting", count: 0, tab: "betting", newSignals: 0 },
      { module: "predictions", label: "Predictions", count: 0, tab: "predictions", newSignals: 0 },
    ],
    opportunities: [],
    personalized: {
      holdingsCount: 0,
      watchlistCount: 0,
      radarSignalCount: 0,
      coverageLine: null,
      intelNote: "Signal review still warming up — open a desk or retry shortly.",
      simRecord: null,
      radarHits: [],
    },
    compareLens: [],
    moduleStories: {},
    audioBriefingScript: "",
    sentiment: { reddit: "neutral", x: "neutral", news: "neutral" },
    breakingNewsCount: 0,
    generatedAt: now.toISOString(),
    scenarioDisclaimer: "Scenarios marked * are educational context — not forecasts.",
    alertUnreadCount: 0,
    degraded: true,
  };
}

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
      // Keep last good briefing — or seed a local shell so Home never goes blank.
      setData((prev) => prev ?? localFallbackBriefing());
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
