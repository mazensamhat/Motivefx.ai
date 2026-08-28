/**
 * Explicit market-data truth states (Ops Master Plan §9).
 * SIMULATED/DEMO must never present as LIVE.
 */

export const TRUTH_STATES = [
  "LIVE",
  "DELAYED",
  "CACHED",
  "ESTIMATED",
  "DERIVED",
  "SIMULATED",
  "DEMO",
  "UNAVAILABLE",
  "STALE",
  "UNKNOWN",
] as const;

export type TruthState = (typeof TRUTH_STATES)[number];

const SET = new Set<string>(TRUTH_STATES);

/** States that may appear as production market truth for display/scoring. */
export const PRODUCTION_TRUTH_STATES: ReadonlySet<TruthState> = new Set([
  "LIVE",
  "DELAYED",
  "CACHED",
  "ESTIMATED",
  "DERIVED",
]);

/** States that must never masquerade as live. */
export const NON_LIVE_TRUTH_STATES: ReadonlySet<TruthState> = new Set([
  "SIMULATED",
  "DEMO",
  "UNAVAILABLE",
  "STALE",
  "UNKNOWN",
]);

export function resolveTruthState(raw: string | null | undefined): TruthState {
  const key = (raw ?? "").trim().toUpperCase();
  if (SET.has(key)) return key as TruthState;
  return "UNKNOWN";
}

export function isProductionTruth(state: TruthState): boolean {
  return PRODUCTION_TRUTH_STATES.has(state);
}

export function isSimulatedOrDemo(state: TruthState): boolean {
  return state === "SIMULATED" || state === "DEMO";
}

/** Map legacy G1 SourceType → TruthState. */
export function truthStateFromSourceType(
  sourceType: string,
  opts?: { stale?: boolean; unavailable?: boolean }
): TruthState {
  if (opts?.unavailable) return "UNAVAILABLE";
  if (opts?.stale) return "STALE";
  switch (sourceType.toUpperCase()) {
    case "LIVE":
      return "LIVE";
    case "DELAYED":
      return "DELAYED";
    case "DERIVED":
      return "DERIVED";
    case "MODEL":
      return "ESTIMATED";
    case "DEMO":
      return "DEMO";
    case "SYNTHETIC":
      return "SIMULATED";
    case "NONE":
      return "UNAVAILABLE";
    default:
      return "UNKNOWN";
  }
}

/**
 * Fail-closed: production signal path rejects DEMO/SIMULATED/STALE/UNKNOWN/UNAVAILABLE.
 */
export function assertPromotableToMarketTruth(state: TruthState): boolean {
  if (isSimulatedOrDemo(state)) return false;
  if (state === "UNAVAILABLE" || state === "STALE" || state === "UNKNOWN") return false;
  return isProductionTruth(state);
}

export type TruthStateBadge = {
  state: TruthState;
  label: string;
  tone: "live" | "warn" | "critical" | "muted" | "ai";
};

export function truthStateBadge(state: TruthState): TruthStateBadge {
  switch (state) {
    case "LIVE":
      return { state, label: "LIVE", tone: "live" };
    case "DELAYED":
    case "CACHED":
      return { state, label: state, tone: "warn" };
    case "ESTIMATED":
    case "DERIVED":
      return { state, label: state, tone: "ai" };
    case "SIMULATED":
    case "DEMO":
      return { state, label: state, tone: "critical" };
    case "STALE":
    case "UNAVAILABLE":
      return { state, label: state, tone: "critical" };
    default:
      return { state, label: "UNKNOWN", tone: "muted" };
  }
}
