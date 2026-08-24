import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import {
  providerHealthFlags,
  type ProviderSwitch,
} from "@/lib/terminal/provider-switches";

const PROVIDER_META: Record<
  ProviderSwitch,
  { label: string; envKey: string }
> = {
  FINNHUB: { label: "Finnhub", envKey: "FINNHUB_ENABLED" },
  COINSTATS: { label: "CoinStats", envKey: "COINSTATS_ENABLED" },
  ODDS_API: { label: "The Odds API", envKey: "ODDS_API_ENABLED" },
  POLYMARKET: { label: "Polymarket", envKey: "POLYMARKET_ENABLED" },
  OPTIONS_FLOW: { label: "Options flow", envKey: "OPTIONS_FLOW_ENABLED" },
  ASK_MOTIVE: { label: "Ask Motive (AI)", envKey: "ASK_MOTIVE_ENABLED" },
  SHARP_API: { label: "Sharp API", envKey: "SHARP_API_ENABLED" },
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const flags = providerHealthFlags();
    const providers = (Object.keys(PROVIDER_META) as ProviderSwitch[]).map((id) => ({
      id,
      label: PROVIDER_META[id].label,
      envKey: PROVIDER_META[id].envKey,
      enabled: flags[id],
    }));

    return json({
      generatedAt: new Date().toISOString(),
      providers,
    });
  } catch (error) {
    console.error("[admin/providers]", error);
    return serverError("Could not load providers.");
  }
}
