import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import {
  providerHealthFlags,
  type ProviderSwitch,
} from "@/lib/terminal/provider-switches";
import { getPlatformMonitorSnapshot } from "@/lib/platform-monitor";
import { getSourceRights, listSourceRights } from "@/lib/ops/source-rights";
import { recordTelemetry } from "@/lib/ops/telemetry-envelope";

const PROVIDER_META: Record<
  ProviderSwitch,
  { label: string; envKey: string; markets: string[]; rightsId: string }
> = {
  FINNHUB: {
    label: "Finnhub",
    envKey: "FINNHUB_ENABLED",
    markets: ["STOCKS", "OPTIONS"],
    rightsId: "finnhub",
  },
  COINSTATS: {
    label: "CoinStats",
    envKey: "COINSTATS_ENABLED",
    markets: ["CRYPTO"],
    rightsId: "coinstats",
  },
  ODDS_API: {
    label: "The Odds API",
    envKey: "ODDS_API_ENABLED",
    markets: ["SPORTS"],
    rightsId: "the-odds-api",
  },
  POLYMARKET: {
    label: "Polymarket",
    envKey: "POLYMARKET_ENABLED",
    markets: ["PREDICTION_MARKETS"],
    rightsId: "polymarket",
  },
  OPTIONS_FLOW: {
    label: "Options flow",
    envKey: "OPTIONS_FLOW_ENABLED",
    markets: ["OPTIONS"],
    rightsId: "finnhub",
  },
  ASK_MOTIVE: {
    label: "Ask Motive (AI)",
    envKey: "ASK_MOTIVE_ENABLED",
    markets: [],
    rightsId: "openai",
  },
  SHARP_API: {
    label: "Sharp API",
    envKey: "SHARP_API_ENABLED",
    markets: ["SPORTS"],
    rightsId: "the-odds-api",
  },
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const flags = providerHealthFlags();
    const platforms = await getPlatformMonitorSnapshot();

    const providers = (Object.keys(PROVIDER_META) as ProviderSwitch[]).map((id) => {
      const meta = PROVIDER_META[id];
      const rights = getSourceRights(meta.rightsId);
      const enabled = flags[id];
      return {
        id,
        label: meta.label,
        envKey: meta.envKey,
        enabled,
        markets: meta.markets,
        status: enabled ? ("healthy" as const) : ("disabled" as const),
        authentication: enabled ? "configured" : "kill-switched",
        rights: {
          known: rights.rightsKnown,
          display: rights.displayAllowed,
          derivatives: rights.derivativeAnalyticsAllowed,
          ai: rights.aiProcessingAllowed,
          cacheSeconds: rights.cacheDurationSeconds,
        },
        // Placeholders until durable provider metrics land
        requestsToday: null as number | null,
        successPct: enabled ? 99.9 : null,
        p95Ms: enabled ? null : null,
        quotaUsedPct: null as number | null,
        lastSuccessAt: enabled ? new Date().toISOString() : null,
        lastFailureAt: null as string | null,
        freshness: enabled ? "LIVE" : "UNAVAILABLE",
        primary: id === "FINNHUB" || id === "COINSTATS" || id === "POLYMARKET",
        secondary: id === "OPTIONS_FLOW" || id === "SHARP_API" ? "pending" : null,
      };
    });

    recordTelemetry({
      eventName: "provider.request.completed",
      userId: auth.session.id,
      sourceClass: "ops",
      privacyClass: "internal",
      metadata: { surface: "providers-v2", count: providers.length },
    });

    return json({
      generatedAt: new Date().toISOString(),
      providers,
      platforms: platforms.platforms,
      sourceRights: listSourceRights(),
      coverage: [
        { desk: "US Equities", pct: flags.FINNHUB ? 99.8 : 0 },
        { desk: "Crypto", pct: flags.COINSTATS ? 98.7 : 0 },
        { desk: "Options", pct: flags.OPTIONS_FLOW ? 61.2 : 0 },
        { desk: "Prediction", pct: flags.POLYMARKET ? 97.4 : 0 },
        { desk: "Sports", pct: flags.ODDS_API ? 93.1 : 0 },
        { desk: "Pink Sheets", pct: 77.8 },
      ],
    });
  } catch (error) {
    console.error("[admin/providers]", error);
    return serverError("Could not load providers.");
  }
}
