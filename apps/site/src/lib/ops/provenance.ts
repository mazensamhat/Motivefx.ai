/**
 * Evidence / market-data provenance (Ops Master Plan §8).
 */

import {
  assertPromotableToMarketTruth,
  isSimulatedOrDemo,
  truthStateFromSourceType,
  type TruthState,
} from "./truth-state";

export type SourceProvenance = {
  sourceProvider: string;
  sourceType: string;
  sourceTimestamp: string;
  retrievedAt: string;
  normalizedAt?: string;
  freshnessSeconds?: number;
  symbol?: string;
  instrumentId?: string;
  sourceConfidence: number;
  licensedForDisplay: boolean;
  licensedForDerivativeUse: boolean;
  simulated: boolean;
  delayed: boolean;
  estimated: boolean;
  truthState: TruthState;
};

export type ProvenanceInput = {
  sourceProvider: string;
  sourceType: string;
  sourceTimestamp: string;
  retrievedAt?: string;
  normalizedAt?: string;
  symbol?: string;
  instrumentId?: string;
  sourceConfidence?: number;
  licensedForDisplay?: boolean;
  licensedForDerivativeUse?: boolean;
  simulated?: boolean;
  delayed?: boolean;
  estimated?: boolean;
  stale?: boolean;
  unavailable?: boolean;
};

export function buildProvenance(input: ProvenanceInput): SourceProvenance {
  const retrievedAt = input.retrievedAt ?? new Date().toISOString();
  const simulated = Boolean(input.simulated) || input.sourceType.toUpperCase() === "DEMO" || input.sourceType.toUpperCase() === "SYNTHETIC";
  const delayed = Boolean(input.delayed) || input.sourceType.toUpperCase() === "DELAYED";
  const estimated =
    Boolean(input.estimated) ||
    input.sourceType.toUpperCase() === "MODEL" ||
    input.sourceType.toUpperCase() === "DERIVED";

  const truthState = truthStateFromSourceType(input.sourceType, {
    stale: input.stale,
    unavailable: input.unavailable,
  });

  // Force DEMO/SIMULATED truth when flagged even if sourceType said LIVE.
  const enforced: TruthState = simulated
    ? input.sourceType.toUpperCase() === "DEMO"
      ? "DEMO"
      : "SIMULATED"
    : truthState;

  let freshnessSeconds: number | undefined;
  try {
    const src = new Date(input.sourceTimestamp).getTime();
    const ret = new Date(retrievedAt).getTime();
    if (Number.isFinite(src) && Number.isFinite(ret)) {
      freshnessSeconds = Math.max(0, (ret - src) / 1000);
    }
  } catch {
    freshnessSeconds = undefined;
  }

  return {
    sourceProvider: input.sourceProvider.trim() || "UNKNOWN",
    sourceType: input.sourceType,
    sourceTimestamp: input.sourceTimestamp,
    retrievedAt,
    normalizedAt: input.normalizedAt,
    freshnessSeconds,
    symbol: input.symbol,
    instrumentId: input.instrumentId,
    sourceConfidence: input.sourceConfidence ?? 0,
    licensedForDisplay: input.licensedForDisplay ?? false,
    licensedForDerivativeUse: input.licensedForDerivativeUse ?? false,
    simulated,
    delayed,
    estimated,
    truthState: enforced,
  };
}

/** Production Motive Signal / Market Truth promotion gate. */
export function mayPromoteProvenance(p: SourceProvenance): boolean {
  if (p.simulated || isSimulatedOrDemo(p.truthState)) return false;
  if (!p.licensedForDerivativeUse && !p.licensedForDisplay) return false;
  if (!p.sourceProvider || p.sourceProvider === "UNKNOWN") return false;
  return assertPromotableToMarketTruth(p.truthState);
}
