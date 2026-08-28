/**
 * MotiveFX Market Truth Contract (G1).
 * Evidence owns truth. DEMO/SYNTHETIC never enter production Motive Signal.
 */

export type SourceType =
  | "LIVE"
  | "DELAYED"
  | "DERIVED"
  | "MODEL"
  | "DEMO"
  | "SYNTHETIC";

/** Ops Master Plan v1.0 truth states — re-exported for G1 consumers. */
export type { TruthState } from "@/lib/ops/truth-state";
export {
  assertPromotableToMarketTruth,
  isSimulatedOrDemo,
  truthStateFromSourceType,
} from "@/lib/ops/truth-state";

export type DataMode = "PRODUCTION" | "DEMO" | "TEST" | "APP_REVIEW";

export type Freshness = "FRESH" | "AGING" | "STALE" | "EXPIRED";

export type EvidenceMarket =
  | "stocks"
  | "crypto"
  | "penny"
  | "sports"
  | "predictions"
  | "macro"
  | "other";

export type StockEvidenceGroup =
  | "PRICE_MOMENTUM"
  | "OPTIONS_FLOW"
  | "DISCLOSURES"
  | "VOLUME_LIQUIDITY"
  | "NEWS_SENTIMENT"
  | "MACRO_SECTOR";

export type CryptoEvidenceGroup =
  | "PRICE"
  | "VOLUME"
  | "ON_CHAIN"
  | "EXCHANGE_FLOW"
  | "DERIVATIVES"
  | "NEWS";

export type SportsEvidenceGroup =
  | "LINE_MOVEMENT"
  | "MARKET_CONSENSUS"
  | "ODDS_DISPERSION"
  | "AVAILABILITY"
  | "MODEL_DIFFERENCE";

export type PredictionEvidenceGroup =
  | "MARKET_PRICE"
  | "LIQUIDITY"
  | "PRICE_MOVEMENT"
  | "VOLUME"
  | "EVENT_INFORMATION"
  | "MODEL_DIFFERENCE";

export type EvidenceGroup =
  | StockEvidenceGroup
  | CryptoEvidenceGroup
  | SportsEvidenceGroup
  | PredictionEvidenceGroup;

/** Canonical observation entering MotiveFX intelligence. */
export interface MarketEvidence<T = unknown> {
  id: string;
  value: T;
  sourceType: SourceType;
  provider: string;
  sourceReference?: string;
  observedAt: string;
  fetchedAt: string;
  ageSeconds: number;
  freshness: Freshness;
  confidence: number;
  derived: boolean;
  simulation: boolean;
  market: EvidenceMarket;
  symbol?: string;
  entity?: string;
  group?: EvidenceGroup;
  /** Contribution proposed for Motive Signal (0 when expired / blocked). */
  signalContribution?: number;
}

export type LiveFeedStatusCode =
  | "OK"
  | "LIVE_DATA_UNAVAILABLE"
  | "WHALE_FEED_UNAVAILABLE"
  | "OPTIONS_FEED_UNAVAILABLE"
  | "PENNY_FEED_UNAVAILABLE"
  | "PROVIDER_DISABLED"
  | "STALE_EXCLUDED";

export interface LiveFeedResult<T> {
  items: T[];
  status: LiveFeedStatusCode;
  sourceType: SourceType | "NONE";
  provider?: string;
  updatedAt: string;
  error?: string;
  /** Attached MarketEvidence for ledger / signal (production-safe filtered). */
  evidence?: MarketEvidence<T>[];
}

/** Source types allowed to influence production Motive Signal. */
export const PRODUCTION_SIGNAL_SOURCE_TYPES: ReadonlySet<SourceType> = new Set([
  "LIVE",
  "DELAYED",
  "DERIVED",
  "MODEL",
]);

export function isProductionSignalEligible(sourceType: SourceType): boolean {
  return PRODUCTION_SIGNAL_SOURCE_TYPES.has(sourceType);
}

export function assertProductionEvidence(ev: MarketEvidence): boolean {
  if (ev.simulation) return false;
  if (ev.sourceType === "DEMO" || ev.sourceType === "SYNTHETIC") return false;
  if (ev.freshness === "EXPIRED") return false;
  if (!ev.provider?.trim()) return false;
  return isProductionSignalEligible(ev.sourceType);
}
