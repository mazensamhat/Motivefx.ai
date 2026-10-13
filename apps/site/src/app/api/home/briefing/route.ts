import { after } from "next/server";
import { unavailablePersonalized } from "../../../../../../../packages/shared/src/saved-data-state";
import { json } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { getSession } from "@/lib/session";
import { findUserSafeCached } from "@/lib/load-user";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import type { TerminalPlan } from "@/lib/terminal/plan";
import { upsertAlerts } from "@/lib/terminal/alerts";
import { evaluateSignalAlertRules, evaluateWatchAgents } from "@/lib/terminal/engines";
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
import { flushSignalEvidencePersistence } from "@/lib/terminal/market-truth/evidence-ledger";

export const dynamic = "force-dynamic";
// The customer briefing falls back within eight seconds. Post-response durability work is
// independently bounded below so a slow database/provider cannot consume the full function lifetime.
export const maxDuration = 30;

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
    motivfxScore: 0,
    stars: 3,
    marketConfidence: "UNAVAILABLE",
    opportunityCount: 0,
    highRiskAlerts: 0,
    portfolioDelta: null,
    biggestRisk: "Feeds warming up",
    biggestOpportunity: "Scanning…",
    topAiTip: "Live desks are refreshing — pull to retry in a moment.",
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

async function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Home briefing must never hard-fail for logged-in users.
 * JWT session is enough for greeting; DB plan hydrate is best-effort with a short timeout
 * so Prisma pool stalls cannot blank the Home desk.
 */
export async function GET(request: Request) {
  const startedAt = Date.now();
  let displayName: string | null = null;
  /** G3: never trust anonymous ?user_id= for account context — session only. */
  let effectiveId = "demo";
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

  // Keep durable Motive Signal writes alive after the response in serverless runtimes.
  after(async () => {
    await withTimeout(flushSignalEvidencePersistence(), undefined, 8_000);
  });

  if (userIdForAlerts && plan?.features.push_notifications) {
    const alertUserId = userIdForAlerts;
    after(async () => {
      const persistAlerts = async () => {
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

          // Phase 3: evaluate custom predictive alert rules.
          const prefs = await getIntelPrefs(alertUserId);
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

          const agentAlerts = evaluateWatchAgents(prefs.watchAgents ?? [], {
            probabilityViews: (briefing.probabilityViews as ProbabilityView[]) ?? [],
            consensusBreaks: (briefing.consensusBreaks as ConsensusBreak[]) ?? [],
          });
          for (const a of agentAlerts) {
            alerts.push({
              module: String(a.module ?? ""),
              symbol: String(a.symbol ?? ""),
              title: a.title,
              body: a.body ?? "",
              confidence: Number(a.confidence ?? 0),
              alertKey: a.alertKey,
            });
          }

          if (alerts.length) await upsertAlerts(alertUserId, alerts);
        } catch {
          console.warn("[home/briefing] alert_persistence_failed");
        }
      };
      await withTimeout(persistAlerts(), undefined, 8_000);
    });
  }

  return json(briefing, 200, {headers:{"Server-Timing": `briefing;dur=${Date.now()-startedAt}`, "Cache-Control":"private, no-store"}});
}
