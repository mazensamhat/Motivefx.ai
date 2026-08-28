/**
 * Canonical MotiveFX product + market-desk registry (Ops Master Plan §5).
 * Unknown values resolve to UNKNOWN and count as instrumentation errors.
 */

export const MOTIVEFX_PRODUCTS = [
  "DAILY_BRIEF",
  "MOTIVE_SIGNAL",
  "SIGNAL_GRAPH",
  "OPPORTUNITY_RADAR",
  "MARKET_DNA",
  "EVIDENCE_STACK",
  "ASK_MOTIVE",
  "PORTFOLIO",
  "WATCHLIST",
  "ALERTS",
  "VOICE_BRIEF",
  "UNKNOWN",
] as const;

export type MotiveFxProduct = (typeof MOTIVEFX_PRODUCTS)[number];

export const MOTIVEFX_DESKS = [
  "STOCKS",
  "CRYPTO",
  "OPTIONS",
  "PINK_SHEETS",
  "SPORTS",
  "PREDICTION_MARKETS",
  "MACRO",
  "COMMODITIES",
  "FX",
  "SUPPLY_CHAIN",
  "UNKNOWN",
] as const;

export type MotiveFxDesk = (typeof MOTIVEFX_DESKS)[number];

const PRODUCT_SET = new Set<string>(MOTIVEFX_PRODUCTS);
const DESK_SET = new Set<string>(MOTIVEFX_DESKS);

/** Legacy terminal module keys → canonical desk. */
const MODULE_TO_DESK: Record<string, MotiveFxDesk> = {
  trades: "STOCKS",
  stocks: "STOCKS",
  crypto: "CRYPTO",
  options: "OPTIONS",
  penny: "PINK_SHEETS",
  pink_slips: "PINK_SHEETS",
  betting: "SPORTS",
  sports: "SPORTS",
  sports_betting: "SPORTS",
  predictions: "PREDICTION_MARKETS",
  prediction_markets: "PREDICTION_MARKETS",
  macro: "MACRO",
};

/** Feature / route aliases → canonical product. */
const ALIAS_TO_PRODUCT: Record<string, MotiveFxProduct> = {
  "daily-brief": "DAILY_BRIEF",
  daily_brief: "DAILY_BRIEF",
  briefing: "DAILY_BRIEF",
  "motive-signal": "MOTIVE_SIGNAL",
  motive_signal: "MOTIVE_SIGNAL",
  signal: "MOTIVE_SIGNAL",
  "signal-graph": "SIGNAL_GRAPH",
  signal_graph: "SIGNAL_GRAPH",
  graph: "SIGNAL_GRAPH",
  "opportunity-radar": "OPPORTUNITY_RADAR",
  opportunity_radar: "OPPORTUNITY_RADAR",
  radar: "OPPORTUNITY_RADAR",
  "market-dna": "MARKET_DNA",
  market_dna: "MARKET_DNA",
  dna: "MARKET_DNA",
  "evidence-stack": "EVIDENCE_STACK",
  evidence_stack: "EVIDENCE_STACK",
  evidence: "EVIDENCE_STACK",
  "ask-motive": "ASK_MOTIVE",
  ask_motive: "ASK_MOTIVE",
  portfolio: "PORTFOLIO",
  watchlist: "WATCHLIST",
  alerts: "ALERTS",
  "voice-brief": "VOICE_BRIEF",
  voice_brief: "VOICE_BRIEF",
};

export type RegistryResolveResult<T> = {
  value: T;
  known: boolean;
  raw: string;
};

export function resolveProduct(raw: string | null | undefined): RegistryResolveResult<MotiveFxProduct> {
  const key = (raw ?? "").trim();
  if (!key) return { value: "UNKNOWN", known: false, raw: key };
  const upper = key.toUpperCase().replace(/[-\s]/g, "_");
  if (PRODUCT_SET.has(upper)) return { value: upper as MotiveFxProduct, known: upper !== "UNKNOWN", raw: key };
  const alias = ALIAS_TO_PRODUCT[key.toLowerCase()] ?? ALIAS_TO_PRODUCT[upper.toLowerCase()];
  if (alias) return { value: alias, known: true, raw: key };
  return { value: "UNKNOWN", known: false, raw: key };
}

export function resolveDesk(raw: string | null | undefined): RegistryResolveResult<MotiveFxDesk> {
  const key = (raw ?? "").trim();
  if (!key) return { value: "UNKNOWN", known: false, raw: key };
  const upper = key.toUpperCase().replace(/[-\s]/g, "_");
  if (DESK_SET.has(upper)) return { value: upper as MotiveFxDesk, known: upper !== "UNKNOWN", raw: key };
  const fromModule = MODULE_TO_DESK[key.toLowerCase()];
  if (fromModule) return { value: fromModule, known: true, raw: key };
  return { value: "UNKNOWN", known: false, raw: key };
}

export function isKnownProduct(value: string): value is MotiveFxProduct {
  return PRODUCT_SET.has(value) && value !== "UNKNOWN";
}

export function isKnownDesk(value: string): value is MotiveFxDesk {
  return DESK_SET.has(value) && value !== "UNKNOWN";
}
