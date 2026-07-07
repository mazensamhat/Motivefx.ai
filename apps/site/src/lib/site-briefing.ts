import { prisma } from "@motivefx/database";
import { fetchBackendJson, getBackendSession } from "./backend";
import type { IntelligenceMarketId, PricingTierId } from "./tiers";
import { INTELLIGENCE_MARKETS, tierById } from "./tiers";
import { userHasActiveSubscription } from "./subscription-access";

const SITE_TO_MODULE: Record<IntelligenceMarketId, string> = {
  stocks: "trades",
  crypto: "crypto",
  pink_slips: "penny",
  sports_betting: "betting",
  prediction_markets: "predictions",
};

function parseSelectedMarkets(raw: string | null): IntelligenceMarketId[] {
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(INTELLIGENCE_MARKETS.map((m) => m.id));
    return parsed.filter((m): m is IntelligenceMarketId => typeof m === "string" && valid.has(m as IntelligenceMarketId));
  } catch {
    return [];
  }
}

export function backendModulesForSiteUser(tier: PricingTierId, selectedMarkets: IntelligenceMarketId[]): string[] {
  const t = tierById(tier);
  if (t.intelligenceMarketsIncluded === "all") {
    return Object.values(SITE_TO_MODULE);
  }
  const cap = t.intelligenceMarketsIncluded;
  return selectedMarkets
    .map((m) => SITE_TO_MODULE[m])
    .filter(Boolean)
    .slice(0, cap);
}

type BriefingPayload = Record<string, unknown> & {
  opportunities?: Array<{ module?: string; symbol?: string }>;
  moduleSummaries?: Array<{ module?: string }>;
  compareLens?: Array<{ module?: string }>;
  moduleStories?: Record<string, string>;
  opportunityCount?: number;
  biggestOpportunity?: string;
};

function applySiteTierToBriefing(briefing: BriefingPayload, allowed: string[]): BriefingPayload {
  if (allowed.length === 0) return briefing;
  const allowedSet = new Set(allowed);

  const opportunities = (briefing.opportunities ?? []).filter((o) => allowedSet.has(o.module ?? ""));
  const moduleSummaries = (briefing.moduleSummaries ?? []).filter((s) => allowedSet.has(s.module ?? ""));
  const compareLens = (briefing.compareLens ?? []).filter((c) => allowedSet.has(c.module ?? ""));
  const moduleStories = Object.fromEntries(
    Object.entries(briefing.moduleStories ?? {}).filter(([key]) => allowedSet.has(key))
  );

  return {
    ...briefing,
    opportunities,
    opportunityCount: opportunities.length,
    biggestOpportunity: opportunities[0]?.symbol ?? briefing.biggestOpportunity ?? "Scanning…",
    highRiskAlerts: opportunities.filter((o) => {
      const risk = (o as { riskLevel?: string }).riskLevel;
      return risk === "high" || risk === "extreme";
    }).length,
    moduleSummaries,
    compareLens,
    moduleStories,
  };
}

/** Postgres is source of truth — restore briefing when Render SQLite plan is stale. */
export async function loadSiteBriefing(email: string): Promise<Record<string, unknown> | null> {
  const siteUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      email: true,
      intelligenceTier: true,
      selectedMarkets: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      accessExpiresAt: true,
      disabledAt: true,
    },
  });
  if (!siteUser) return null;

  const backend = await getBackendSession(siteUser.email, { force: true });
  if (!backend) return null;

  const userBriefing = await fetchBackendJson<BriefingPayload>(
    `/api/home/briefing?user_id=${encodeURIComponent(backend.userId)}`,
    backend
  );
  if (!userBriefing) return null;

  const hasSub = userHasActiveSubscription(siteUser);
  if (!hasSub) return userBriefing;

  const tier = siteUser.intelligenceTier as PricingTierId;
  const selected = parseSelectedMarkets(siteUser.selectedMarkets);
  const allowed = backendModulesForSiteUser(tier, selected);

  const opps = userBriefing.opportunities ?? [];
  if (opps.length > 0) {
    return applySiteTierToBriefing(userBriefing, allowed);
  }

  const demoBriefing = await fetchBackendJson<BriefingPayload>(`/api/home/briefing?user_id=demo`, backend);
  if (!demoBriefing) return userBriefing;

  return {
    ...userBriefing,
    ...applySiteTierToBriefing(demoBriefing, allowed),
    personalized: userBriefing.personalized ?? demoBriefing.personalized,
    greeting: userBriefing.greeting ?? demoBriefing.greeting,
    entitlements: {
      tier,
      allowedMarkets: allowed,
      source: "site_db",
    },
  };
}
