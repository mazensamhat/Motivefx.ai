import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { apiGet } from "../lib/api";
import type { HomeBriefing } from "../types";
import { unavailablePersonalized } from "../../../packages/shared/src/saved-data-state";
import {
  formatBriefingGreeting,
  formatBriefingKicker,
  getBriefingPeriod,
} from "../../../packages/shared/src/briefing-period";

let lastVerified: {owner:string;data:HomeBriefing}|null=null;

/** Instant shell so Home never blanks when the API is slow or the pool is warm. */
function localFallbackBriefing(): HomeBriefing {
  const now = new Date();
  const period = getBriefingPeriod(now);
  return {
    greeting: formatBriefingGreeting(period),
    greetingName: null,
    briefingPeriod: period,
    briefingKicker: formatBriefingKicker(period),
    tagline: "Daily Brief · Opportunity Radar",
    motivfxScore: 0,
    stars: 3,
    marketConfidence: "UNAVAILABLE",
    opportunityCount: 0,
    highRiskAlerts: 0,
    portfolioDelta: null,
    biggestRisk: "Feeds warming up",
    biggestOpportunity: "Scanning…",
    topAiTip: "Live desks are refreshing — retry in a moment.",
    moduleSummaries: [
      { module: "trades", label: "Trades", count: null, tab: "stocks", newSignals: null },
      { module: "penny", label: "Pink Slips", count: null, tab: "penny", newSignals: null },
      { module: "crypto", label: "Crypto", count: null, tab: "crypto", newSignals: null },
      { module: "betting", label: "Betting", count: null, tab: "betting", newSignals: null },
      { module: "predictions", label: "Predictions", count: null, tab: "predictions", newSignals: null },
    ],
    opportunities: [],
    personalized: unavailablePersonalized(),
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
  const { user, loading: authLoading } = useAuth();
  const owner = user?.userId ?? "anonymous";
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const version = useRef(0);
  const busyOwner = useRef<{owner:string;ticket:number}|null>(null);
  const [cache, setCache] = useState<{ owner: string; data: HomeBriefing } | null>(null);
  const data = cache?.owner === owner ? cache.data : lastVerified?.owner === owner ? lastVerified.data : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (busyOwner.current?.owner === owner) return;
    const ticket = ++version.current;
    busyOwner.current = {owner,ticket};
    setRefreshing(true);
    try {
      const result = await apiGet<HomeBriefing>("/home/briefing");
      if (!result || !Array.isArray(result.opportunities) || !Array.isArray(result.moduleSummaries)) {
        throw new Error("Briefing returned an incomplete response. Please retry.");
      }
      if (currentOwner.current !== owner || version.current !== ticket) return;
      setCache({ owner, data: result });
      if(!result.degraded) lastVerified={owner,data:result};
      setError(null);
    } catch (e) {
      // Keep last good briefing — or seed a local shell so Home never goes blank.
      if (currentOwner.current !== owner || version.current !== ticket) return;
      setCache((prev) => prev?.owner === owner ? prev : { owner, data: localFallbackBriefing() });
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if(busyOwner.current?.ticket===ticket)busyOwner.current=null;
      if (currentOwner.current === owner && version.current === ticket) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [owner, authLoading]);

  useEffect(() => {
    if(!authLoading && lastVerified?.owner !== owner)lastVerified=null;
    setLoading(true);
    void refresh();
    const id = setInterval(() => {
      if(!document.hidden) void refresh();
    }, intervalMs);
    const onVisible=()=>{if(!document.hidden)void refresh();};
    document.addEventListener("visibilitychange",onVisible);
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener("motivefx:briefing-refresh", onRefresh);
    return () => {
      ++version.current;
      busyOwner.current=null;
      clearInterval(id);
      document.removeEventListener("visibilitychange",onVisible);
      window.removeEventListener("motivefx:briefing-refresh", onRefresh);
    };
  }, [refresh, intervalMs]);

  return { data, loading, error, refreshing, refresh };
}
