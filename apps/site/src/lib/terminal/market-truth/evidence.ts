import { ageSeconds, classifyFreshness, type FreshnessProfile } from "./freshness";
import {
  assertProductionEvidence,
  type EvidenceMarket,
  type EvidenceGroup,
  type MarketEvidence,
  type SourceType,
} from "./types";

export type WrapEvidenceInput<T> = {
  id: string;
  value: T;
  sourceType: SourceType;
  provider: string;
  sourceReference?: string;
  observedAt?: string;
  fetchedAt?: string;
  confidence?: number;
  derived?: boolean;
  simulation?: boolean;
  market: EvidenceMarket;
  symbol?: string;
  entity?: string;
  group?: EvidenceGroup;
  freshnessProfile?: FreshnessProfile;
  signalContribution?: number;
};

export function wrapMarketEvidence<T>(input: WrapEvidenceInput<T>): MarketEvidence<T> {
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  const observedAt = input.observedAt ?? fetchedAt;
  const age = ageSeconds(observedAt);
  const freshness = classifyFreshness(age, input.freshnessProfile ?? "default");
  const simulation =
    input.simulation ??
    (input.sourceType === "DEMO" || input.sourceType === "SYNTHETIC");

  return {
    id: input.id,
    value: input.value,
    sourceType: input.sourceType,
    provider: input.provider,
    sourceReference: input.sourceReference,
    observedAt,
    fetchedAt,
    ageSeconds: age,
    freshness,
    confidence: Math.max(0, Math.min(100, Math.round(input.confidence ?? 50))),
    derived: Boolean(input.derived),
    simulation,
    market: input.market,
    symbol: input.symbol,
    entity: input.entity,
    group: input.group,
    signalContribution:
      freshness === "EXPIRED" ? 0 : input.signalContribution,
  };
}

/** Filter to production-signal-eligible evidence only. */
export function filterForProductionSignal<T>(
  items: MarketEvidence<T>[]
): MarketEvidence<T>[] {
  return items.filter(assertProductionEvidence);
}

/** Invariant: zero DEMO/SYNTHETIC in a production signal bag. */
export function countContamination(items: MarketEvidence[]): {
  demo: number;
  synthetic: number;
  unattributed: number;
  expiredContributing: number;
} {
  let demo = 0;
  let synthetic = 0;
  let unattributed = 0;
  let expiredContributing = 0;
  for (const e of items) {
    if (e.sourceType === "DEMO") demo += 1;
    if (e.sourceType === "SYNTHETIC") synthetic += 1;
    if (!e.provider?.trim()) unattributed += 1;
    if (e.freshness === "EXPIRED" && (e.signalContribution ?? 0) !== 0) {
      expiredContributing += 1;
    }
  }
  return { demo, synthetic, unattributed, expiredContributing };
}

export function productionTruthPass(items: MarketEvidence[]): boolean {
  const c = countContamination(items);
  return (
    c.demo === 0 &&
    c.synthetic === 0 &&
    c.unattributed === 0 &&
    c.expiredContributing === 0
  );
}
