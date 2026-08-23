/**
 * G1 Market Evidence Ledger — in-process persistence of evidence used by Motive Signal.
 * Durable DB storage lands with G6 Signal Snapshots; this ledger enables
 * "Why was NVDA 78 at 2:32?" within the current process lifetime.
 */

import type { MarketEvidence } from "./types";
import { assertProductionEvidence } from "./types";
import { filterForProductionSignal } from "./evidence";

export type LedgerEntry = {
  ledgerId: string;
  recordedAt: string;
  symbol: string;
  motiveSignal?: number;
  engineVersion: string;
  evidence: MarketEvidence[];
  /** Production-eligible subset only */
  signalEvidence: MarketEvidence[];
};

const MAX_ENTRIES = 500;
const ledger: LedgerEntry[] = [];

export const MOTIVE_SIGNAL_ENGINE_VERSION = "MOTIVE_SIGNAL_V4_2_HARDENING";

export function recordSignalEvidence(input: {
  symbol: string;
  motiveSignal?: number;
  evidence: MarketEvidence[];
  engineVersion?: string;
}): LedgerEntry {
  const signalEvidence = filterForProductionSignal(input.evidence);
  const entry: LedgerEntry = {
    ledgerId: `${input.symbol.toUpperCase()}-${Date.now()}`,
    recordedAt: new Date().toISOString(),
    symbol: input.symbol.toUpperCase(),
    motiveSignal: input.motiveSignal,
    engineVersion: input.engineVersion ?? MOTIVE_SIGNAL_ENGINE_VERSION,
    evidence: input.evidence,
    signalEvidence,
  };
  ledger.unshift(entry);
  if (ledger.length > MAX_ENTRIES) ledger.length = MAX_ENTRIES;
  return entry;
}

export function getLedgerForSymbol(symbol: string, limit = 20): LedgerEntry[] {
  const s = symbol.toUpperCase();
  return ledger.filter((e) => e.symbol === s).slice(0, limit);
}

export function getLatestLedgerEntry(symbol: string): LedgerEntry | undefined {
  return getLedgerForSymbol(symbol, 1)[0];
}

/** Truth Console metric: DEMO/SYNTHETIC count inside production signal bags. */
export function ledgerContaminationStats(): {
  entries: number;
  demoInSignal: number;
  syntheticInSignal: number;
} {
  let demoInSignal = 0;
  let syntheticInSignal = 0;
  for (const e of ledger) {
    for (const ev of e.signalEvidence) {
      if (!assertProductionEvidence(ev)) {
        if (ev.sourceType === "DEMO") demoInSignal += 1;
        if (ev.sourceType === "SYNTHETIC") syntheticInSignal += 1;
      }
    }
  }
  return { entries: ledger.length, demoInSignal, syntheticInSignal };
}
