import { json } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { getSession } from "@/lib/session";
import { findUserSafeCached } from "@/lib/load-user";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import type { TerminalPlan } from "@/lib/terminal/plan";
import { upsertAlerts } from "@/lib/terminal/alerts";
import { evaluateSignalAlertRules } from "@/lib/terminal/engines";
import {
  formatBriefingGreeting,
  formatBriefingKicker,
  getBriefingPeriod,
} from "../../../../../../../packages/shared/src/briefing-period";
import type {
  ConsensusBreak,
  MarketGenome,
  ProbabilityView,
  SignalAlertRule,
} from "@/lib/terminal/engines";
import { getIntelPrefs } from "@/lib/terminal/intel-prefs";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function fallbackBriefing(displayName: string | null) {
  const name = (displayName ?? "Trader").split(/\s+/)[0];
  const now = new Date();
  const period = getBriefingPeriod(now);
  return {
    greeting: formatBriefingGreeting(period, name),
    greetingName: name,
    briefingPeriod: period,
    briefingKicker: formatBriefingKicker(period),
    tagline: "Daily Brief · Opportunity Radar",
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

async function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } catch {
    return fallback;
  }
}

/**
 * Home briefing must never hard-fail for logged-in users.
 * JWT session is enough for greeting; DB plan hydrate is best-effort with a short timeout
 * so Prisma pool stalls cannot blank the Home desk.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryUserId = url.searchParams.get("user_id");

  let displayName: string | null = null;
  let effectiveId = queryUserId && queryUserId !== "demo" ? queryUserId : "demo";
  let plan = null as TerminalPlan | null;
  let userIdForAlerts: string | null = null;

  try {
    const cookie = await getSession();
    if (cookie) {
      effectiveId = cookie.id;
      displayName = cookie.email?.split("@")[0] ?? null;

      const user = await findUserSafeCached({ id: cookie.id }, { timeoutMs: 1500 });
      if (user && !user.disabledAt) {
        displayName = user.displayName ?? user.email?.split("@")[0] ?? displayName;
        plan = await entitlementsPlanForUser(user);
        effectiveId = user.id;
        userIdForAlerts = user.id;
      }
    }
  } catch {
    /* continue with anonymous/degraded briefing */
  }

  const briefing = await withTimeout(
    buildHomeBriefing({ displayName, userId: effectiveId, plan }),
    fallbackBriefing(displayName),
    8_000
  );

  if (userIdForAlerts && plan?.features.push_notifications) {
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

        // Phase 3: evaluate custom predictive alert rules
        const prefs = await getIntelPrefs(userIdForAlerts);
        const predictive = evaluateSignalAlertRules(prefs.alertRules as SignalAlertRule[], {
          probabilityViews: (briefing.probabilityViews as ProbabilityView[]) ?? [],
          consensusBreaks: (briefing.consensusBreaks as ConsensusBreak[]) ?? [],
          marketGenomes: (briefing.marketGenomes as MarketGenome[]) ?? [],
        });
        for (const a of predictive) {
          alerts.push({
            module: String(a.module ?? ""),
            symbol: String(a.symbol ?? ""),
            title: a.title,
            body: a.body ?? "",
            confidence: Number(a.confidence ?? 0),
            alertKey: a.alertKey,
          });
        }

        if (alerts.length) await upsertAlerts(userIdForAlerts, alerts);
      } catch {
        /* ignore */
      }
    })();
  }

  return json(briefing);
}
