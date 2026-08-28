/**
 * Market Truth Control Room aggregations (Ops Master Plan §13–15).
 */

import {
  getRecentLedgerEntries,
  ledgerContaminationStats,
  type LedgerEntry,
} from "@/lib/terminal/market-truth/evidence-ledger";
import { truthStateFromSourceType, type TruthState } from "@/lib/ops/truth-state";
import { buildProvenance } from "@/lib/ops/provenance";
import { mayDisplay, mayUseForDerivatives } from "@/lib/ops/source-rights";

export type TruthAssetRow = {
  symbol: string;
  motiveSignal: number | null;
  provider: string;
  sourceType: string;
  truthState: TruthState;
  sourceTimestamp: string | null;
  retrievedAt: string | null;
  ageSeconds: number | null;
  evidenceCount: number;
  signalEligible: number;
  ledgerId: string;
  recordedAt: string;
};

export type FreshnessBucket = {
  bucket: string;
  count: number;
};

function ageBucket(ageSeconds: number | null): string {
  if (ageSeconds == null) return "UNKNOWN";
  if (ageSeconds < 1) return "< 1 sec";
  if (ageSeconds < 5) return "1–5 sec";
  if (ageSeconds < 30) return "5–30 sec";
  if (ageSeconds < 300) return "30 sec–5 min";
  if (ageSeconds < 3600) return ">5 min";
  return "STALE";
}

export function buildMarketTruthControlRoom(symbolFilter?: string) {
  const entries = getRecentLedgerEntries(100);
  const filtered = symbolFilter
    ? entries.filter((e) => e.symbol === symbolFilter.toUpperCase())
    : entries;

  const bySymbol = new Map<string, LedgerEntry>();
  for (const e of filtered) {
    if (!bySymbol.has(e.symbol)) bySymbol.set(e.symbol, e);
  }

  const assets: TruthAssetRow[] = [...bySymbol.values()].map((entry) => {
    const primary = entry.signalEvidence[0] ?? entry.evidence[0];
    const truthState = primary
      ? truthStateFromSourceType(primary.sourceType, {
          stale: primary.freshness === "STALE" || primary.freshness === "EXPIRED",
        })
      : ("UNKNOWN" as TruthState);

    return {
      symbol: entry.symbol,
      motiveSignal: entry.motiveSignal ?? null,
      provider: primary?.provider ?? "—",
      sourceType: primary?.sourceType ?? "UNKNOWN",
      truthState,
      sourceTimestamp: primary?.observedAt ?? null,
      retrievedAt: primary?.fetchedAt ?? null,
      ageSeconds: primary?.ageSeconds ?? null,
      evidenceCount: entry.evidence.length,
      signalEligible: entry.signalEvidence.length,
      ledgerId: entry.ledgerId,
      recordedAt: entry.recordedAt,
    };
  });

  const truthStateCounts: Record<string, number> = {};
  const freshnessBuckets: Record<string, number> = {};
  let rightsBlocked = 0;

  for (const entry of filtered) {
    for (const ev of entry.evidence) {
      const state = truthStateFromSourceType(ev.sourceType, {
        stale: ev.freshness === "STALE" || ev.freshness === "EXPIRED",
      });
      truthStateCounts[state] = (truthStateCounts[state] ?? 0) + 1;
      const bucket = ageBucket(ev.ageSeconds);
      freshnessBuckets[bucket] = (freshnessBuckets[bucket] ?? 0) + 1;
      if (!mayDisplay(ev.provider) || !mayUseForDerivatives(ev.provider)) {
        // Unknown providers fail-closed — count for visibility
        if (!mayDisplay(ev.provider)) rightsBlocked += 1;
      }
    }
  }

  const provenanceSamples = filtered.slice(0, 12).flatMap((entry) =>
    (entry.signalEvidence[0] ? [entry.signalEvidence[0]] : entry.evidence.slice(0, 1)).map((ev) => {
      const p = buildProvenance({
        sourceProvider: ev.provider,
        sourceType: ev.sourceType,
        sourceTimestamp: ev.observedAt,
        retrievedAt: ev.fetchedAt,
        symbol: entry.symbol,
        sourceConfidence: ev.confidence,
        simulated: ev.simulation,
        licensedForDisplay: mayDisplay(ev.provider),
        licensedForDerivativeUse: mayUseForDerivatives(ev.provider),
        stale: ev.freshness === "STALE" || ev.freshness === "EXPIRED",
      });
      return {
        symbol: entry.symbol,
        ...p,
        mayPromote: !p.simulated && p.licensedForDerivativeUse && p.truthState !== "DEMO",
      };
    })
  );

  const freshness: FreshnessBucket[] = [
    "< 1 sec",
    "1–5 sec",
    "5–30 sec",
    "30 sec–5 min",
    ">5 min",
    "STALE",
    "UNKNOWN",
  ].map((bucket) => ({ bucket, count: freshnessBuckets[bucket] ?? 0 }));

  return {
    assets,
    truthStateCounts,
    freshness,
    provenanceSamples,
    rightsBlocked,
    contamination: ledgerContaminationStats(),
  };
}
