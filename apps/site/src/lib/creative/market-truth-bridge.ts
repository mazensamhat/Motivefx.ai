/**
 * Bridge approved Market Truth → Creative Intelligence.
 * AI never invents live market state — only packages ledger / durable snapshots.
 */

import { getLatestLedgerEntry, getRecentLedgerEntries } from "@/lib/terminal/market-truth/evidence-ledger";
import { classifyMotiveStance } from "@/lib/terminal/market-truth/signal-confluence";
import { loadSignalSnapshots } from "@/lib/ops/durable";
import type { MarketTruthStoryInput, TruthClass } from "./types";

function stanceFromContribution(n: number | undefined): string {
  if (n == null || n === 0) return "Neutral";
  if (n > 0) return "Bullish";
  return "Bearish";
}

function truthClassFromEvidence(sourceTypes: string[]): TruthClass {
  if (sourceTypes.some((s) => s === "DEMO")) return "DEMO";
  if (sourceTypes.some((s) => s === "SYNTHETIC")) return "SIMULATED";
  if (sourceTypes.length === 0) return "DEMO";
  return "LIVE";
}

/** Resolve Market Truth for LIVE_MARKET creatives from ledger → durable snapshots. */
export async function resolveApprovedMarketTruth(
  symbol?: string
): Promise<
  | { ok: true; marketTruth: MarketTruthStoryInput; source: "ledger" | "durable" }
  | { ok: false; reason: string }
> {
  const sym = symbol?.trim().toUpperCase();

  const ledgerHit = sym
    ? getLatestLedgerEntry(sym)
    : getRecentLedgerEntries(1)[0];

  if (ledgerHit) {
    const bag = ledgerHit.signalEvidence.length
      ? ledgerHit.signalEvidence
      : ledgerHit.evidence;
    const sourceTypes = bag.map((e) => e.sourceType);
    const evidence = bag.slice(0, 6).map((e) => ({
      label: e.group ?? e.provider ?? "Evidence",
      stance: stanceFromContribution(e.signalContribution),
      note: e.freshness,
    }));
    const score = ledgerHit.motiveSignal ?? null;
    return {
      ok: true,
      source: "ledger",
      marketTruth: {
        symbol: ledgerHit.symbol,
        stance: score != null ? classifyMotiveStance(score) : undefined,
        motiveSignal: score,
        confidence:
          score != null
            ? Math.min(99, 40 + ledgerHit.signalEvidence.length * 12)
            : null,
        truthClass: truthClassFromEvidence(sourceTypes),
        evidence,
        asOf: ledgerHit.recordedAt,
        sourcesKnown: bag.length > 0 && bag.every((e) => Boolean(e.provider)),
      },
    };
  }

  const snaps = await loadSignalSnapshots(40);
  const snap = sym
    ? snaps.find((s) => s.symbol.toUpperCase() === sym)
    : snaps[0];

  if (!snap) {
    return {
      ok: false,
      reason:
        "No approved Market Truth for this symbol yet. Generate a Motive Signal first, or use EVERGREEN / MARKET_AWARE.",
    };
  }

  let evidence: MarketTruthStoryInput["evidence"] = [];
  try {
    const parsed = JSON.parse(snap.signalEvidenceJson || "[]") as {
      group?: string;
      provider?: string;
      signalContribution?: number;
      freshness?: string;
      sourceType?: string;
    }[];
    evidence = parsed.slice(0, 6).map((e) => ({
      label: e.group ?? e.provider ?? "Evidence",
      stance: stanceFromContribution(e.signalContribution),
      note: e.freshness,
    }));
  } catch {
    evidence = [];
  }

  const sourceTypes: string[] = [];
  try {
    const raw = JSON.parse(snap.evidenceJson || "[]") as { sourceType?: string }[];
    for (const e of raw) if (e.sourceType) sourceTypes.push(e.sourceType);
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    source: "durable",
    marketTruth: {
      symbol: snap.symbol,
      stance: snap.stance ?? (snap.motiveSignal != null ? classifyMotiveStance(snap.motiveSignal) : undefined),
      motiveSignal: snap.motiveSignal,
      confidence: snap.confidence,
      truthClass: truthClassFromEvidence(sourceTypes),
      evidence,
      asOf: snap.recordedAt.toISOString(),
      sourcesKnown: evidence.length > 0,
    },
  };
}

/** Themes only — never a live call. */
export function resolveMarketAwareThemes(symbol?: string): {
  symbol: string;
  themes: string[];
} {
  const s = (symbol?.trim() || "EUR/USD").toUpperCase();
  return {
    symbol: s,
    themes: [
      "Indicator overload vs confluence",
      "Direction ≠ trade quality",
      "WAIT as a valid decision",
      "Evidence before conviction",
    ],
  };
}
