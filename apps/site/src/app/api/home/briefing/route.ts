import { json, serverError } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { requireTerminalSession } from "@/lib/terminal/auth";
import { planForUser } from "@/lib/terminal/plan";
import { upsertAlerts } from "@/lib/terminal/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function fallbackBriefing(displayName: string | null) {
  const name = (displayName ?? "Trader").split(/\s+/)[0];
  const now = new Date();
  const hour = now.getUTCHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return {
    greeting: `Good ${period}, ${name}`,
    tagline: "The AI Command Center for Market Intelligence",
    motivfxScore: 62,
    stars: 3,
    marketConfidence: "MODERATE",
    opportunityCount: 0,
    highRiskAlerts: 0,
    portfolioDelta: null,
    biggestRisk: "Feeds warming up",
    biggestOpportunity: "Scanning…",
    topAiTip: "Live desks are refreshing — pull to retry in a moment.",
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const auth = await requireTerminalSession();
    const user = auth.ok ? auth.session.user : null;
    const effectiveId = user?.id ?? userId ?? "demo";
    const plan = user ? planForUser(user) : null;
    const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? null;

    let briefing: Record<string, unknown>;
    try {
      briefing = await Promise.race([
        buildHomeBriefing({ displayName, userId: effectiveId, plan }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("briefing_timeout")), 10_000);
        }),
      ]);
    } catch {
      briefing = fallbackBriefing(displayName);
    }

    if (user && plan?.features.push_notifications) {
      void (async () => {
        try {
          const radar =
            ((briefing.personalized as { radarHits?: Array<Record<string, unknown>> })?.radarHits) ??
            [];
          const alerts = radar.map((h) => ({
            module: String(h.module ?? ""),
            symbol: String(h.symbol ?? ""),
            title: `Radar hit: ${h.symbol}`,
            body: String(h.title ?? ""),
            confidence: Number(h.confidence ?? 0),
            alertKey: `radar-${h.id ?? h.symbol}`,
          }));
          for (const o of ((briefing.opportunities as Array<Record<string, unknown>>) ?? []).slice(
            0,
            3
          )) {
            alerts.push({
              module: String(o.module ?? ""),
              symbol: String(o.symbol ?? ""),
              title: `Top signal: ${o.symbol}`,
              body: String(o.title ?? ""),
              confidence: Number(o.confidence ?? 0),
              alertKey: `signal-${o.id}`,
            });
          }
          if (alerts.length) await upsertAlerts(user.id, alerts);
        } catch {
          /* ignore */
        }
      })();
    }

    return json(briefing);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Briefing unavailable";
    return serverError(message);
  }
}
