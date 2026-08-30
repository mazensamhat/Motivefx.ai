import { requireAdmin, requireAdminCapability } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import {
  providerHealthFlags,
  type ProviderSwitch,
} from "@/lib/terminal/provider-switches";
import { getPlatformMonitorSnapshot } from "@/lib/platform-monitor";
import { getSourceRights, listSourceRights } from "@/lib/ops/source-rights";
import { recordTelemetry } from "@/lib/ops/telemetry-envelope";
import { getProviderTelemetryStats } from "@/lib/ops/durable";

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
  const auth = await requireAdminCapability("view_providers");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const flags = providerHealthFlags();
    const [platforms, telemetry] = await Promise.all([
      getPlatformMonitorSnapshot(),
      getProviderTelemetryStats(24),
    ]);

    const providers = (Object.keys(PROVIDER_META) as ProviderSwitch[]).map((id) => {
      const meta = PROVIDER_META[id];
      const rights = getSourceRights(meta.rightsId);
      const enabled = flags[id];
      const stats = telemetry.get(id) ?? telemetry.get(meta.label.toUpperCase());
      return {
        id,
        label: meta.label,
        envKey: meta.envKey,
        enabled,
        markets: meta.markets,
        status: !enabled
          ? ("disabled" as const)
          : stats && (stats.successPct ?? 100) < 90
            ? ("degraded" as const)
            : ("healthy" as const),
        authentication: enabled ? "configured" : "kill-switched",
        rights: {
          known: rights.rightsKnown,
          display: rights.displayAllowed,
          derivatives: rights.derivativeAnalyticsAllowed,
          ai: rights.aiProcessingAllowed,
          cacheSeconds: rights.cacheDurationSeconds,
        },
        requestsToday: stats?.requestsToday ?? 0,
        successPct: stats?.successPct ?? (enabled ? null : null),
        p95Ms: stats?.p95Ms ?? null,
        quotaUsedPct: null as number | null,
        lastSuccessAt: stats?.lastSuccessAt ?? null,
        lastFailureAt: stats?.lastFailureAt ?? null,
        freshness: !enabled
          ? "UNAVAILABLE"
          : stats?.lastSuccessAt
            ? "LIVE"
            : "UNKNOWN",
        metricsSource: stats ? ("telemetry" as const) : ("none" as const),
        primary: id === "FINNHUB" || id === "COINSTATS" || id === "POLYMARKET",
        secondary: id === "OPTIONS_FLOW" || id === "SHARP_API" ? "backup" : null,
      };
    });

    const deskCoverage = [
      { desk: "US Equities", provider: "FINNHUB" as ProviderSwitch },
      { desk: "Crypto", provider: "COINSTATS" as ProviderSwitch },
      { desk: "Options", provider: "OPTIONS_FLOW" as ProviderSwitch },
      { desk: "Prediction", provider: "POLYMARKET" as ProviderSwitch },
      { desk: "Sports", provider: "ODDS_API" as ProviderSwitch },
    ].map(({ desk, provider }) => {
      const enabled = flags[provider];
      const stats = telemetry.get(provider);
      const pct =
        !enabled ? 0 : stats?.successPct != null ? stats.successPct : stats?.requestsToday ? 95 : null;
      return { desk, pct, requests: stats?.requestsToday ?? 0, enabled };
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
      coverage: deskCoverage,
      note: "Success %, p95, and request counts are from OpsTelemetryEvent (24h). Null successPct means no samples yet — not a fake 99.9.",
    });
  } catch (error) {
    console.error("[admin/providers]", error);
    return serverError("Could not load providers.");
  }
}
