import type { Freshness } from "./types";

/** Default windows (seconds) — tune per evidence type in G1 freshness engine. */
export const FRESHNESS_WINDOWS_SEC = {
  optionsFlow: { fresh: 5 * 60, aging: 15 * 60, stale: 45 * 60 },
  priceMomentum: { fresh: 2 * 60, aging: 10 * 60, stale: 30 * 60 },
  whaleProxy: { fresh: 5 * 60, aging: 20 * 60, stale: 60 * 60 },
  pennyMover: { fresh: 5 * 60, aging: 20 * 60, stale: 60 * 60 },
  disclosure: { fresh: 24 * 3600, aging: 7 * 24 * 3600, stale: 30 * 24 * 3600 },
  news: { fresh: 30 * 60, aging: 3 * 3600, stale: 24 * 3600 },
  default: { fresh: 5 * 60, aging: 20 * 60, stale: 60 * 60 },
} as const;

export type FreshnessProfile = keyof typeof FRESHNESS_WINDOWS_SEC;

export function ageSeconds(observedAt: string | Date, now = Date.now()): number {
  const t = typeof observedAt === "string" ? Date.parse(observedAt) : observedAt.getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now - t) / 1000));
}

export function classifyFreshness(
  ageSec: number,
  profile: FreshnessProfile = "default"
): Freshness {
  const w = FRESHNESS_WINDOWS_SEC[profile];
  if (ageSec <= w.fresh) return "FRESH";
  if (ageSec <= w.aging) return "AGING";
  if (ageSec <= w.stale) return "STALE";
  return "EXPIRED";
}

/** Expired evidence contributes zero to Motive Signal. */
export function signalWeightForFreshness(f: Freshness): number {
  switch (f) {
    case "FRESH":
      return 1;
    case "AGING":
      return 0.6;
    case "STALE":
      return 0.25;
    case "EXPIRED":
      return 0;
  }
}
