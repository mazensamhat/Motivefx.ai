/**
 * G3 provider kill switches — flip without emergency deploy.
 */

export type ProviderSwitch =
  | "FINNHUB"
  | "COINSTATS"
  | "ODDS_API"
  | "POLYMARKET"
  | "OPTIONS_FLOW"
  | "ASK_MOTIVE"
  | "SHARP_API";

function envEnabled(name: string, defaultOn = true): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultOn;
  if (["0", "false", "off", "no", "disabled"].includes(raw)) return false;
  if (["1", "true", "on", "yes", "enabled"].includes(raw)) return true;
  return defaultOn;
}

const ENV_MAP: Record<ProviderSwitch, string> = {
  FINNHUB: "FINNHUB_ENABLED",
  COINSTATS: "COINSTATS_ENABLED",
  ODDS_API: "ODDS_API_ENABLED",
  POLYMARKET: "POLYMARKET_ENABLED",
  OPTIONS_FLOW: "OPTIONS_FLOW_ENABLED",
  ASK_MOTIVE: "ASK_MOTIVE_ENABLED",
  SHARP_API: "SHARP_API_ENABLED",
};

export function isProviderEnabled(provider: ProviderSwitch): boolean {
  return envEnabled(ENV_MAP[provider], true);
}

export function providerHealthFlags(): Record<ProviderSwitch, boolean> {
  return {
    FINNHUB: isProviderEnabled("FINNHUB"),
    COINSTATS: isProviderEnabled("COINSTATS"),
    ODDS_API: isProviderEnabled("ODDS_API"),
    POLYMARKET: isProviderEnabled("POLYMARKET"),
    OPTIONS_FLOW: isProviderEnabled("OPTIONS_FLOW"),
    ASK_MOTIVE: isProviderEnabled("ASK_MOTIVE"),
    SHARP_API: isProviderEnabled("SHARP_API"),
  };
}
