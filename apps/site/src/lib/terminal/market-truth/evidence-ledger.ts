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
const pendingPersistence = new Set<Promise<void>>();

export const MOTIVE_SIGNAL_ENGINE_VERSION = "MOTIVE_SIGNAL_V4_2_HARDENING";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const row = value as Record<string, unknown>;
  return "{" + Object.keys(row).sort().map((key) => JSON.stringify(key) + ":" + stableSerialize(row[key])).join(",") + "}";
}

function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function signalObservationId(input: {
  symbol: string;
  motiveSignal?: number;
  engineVersion: string;
  signalEvidence: MarketEvidence[];
  observedAt: Date;
}): string {
  // One logical signal state gets one durable observation per UTC minute.
  // Concurrent Home requests with identical evidence therefore converge on the same unique ledgerId.
  const minuteBucket = Math.floor(input.observedAt.getTime() / 60_000);
  const signature = stableSerialize({
    symbol: input.symbol.toUpperCase(),
    motiveSignal: input.motiveSignal ?? null,
    engineVersion: input.engineVersion,
    signalEvidence: input.signalEvidence,
    minuteBucket,
  });
  return `${input.symbol.toUpperCase()}-${minuteBucket}-${shortHash(signature)}`;
}

export function recordSignalEvidence(input: {
  symbol: string;
  motiveSignal?: number;
  evidence: MarketEvidence[];
  engineVersion?: string;
}): LedgerEntry {
  const signalEvidence = filterForProductionSignal(input.evidence);
  const observedAt = new Date();
  const engineVersion = input.engineVersion ?? MOTIVE_SIGNAL_ENGINE_VERSION;
  const symbol = input.symbol.toUpperCase();
  const entry: LedgerEntry = {
    ledgerId: signalObservationId({
      symbol,
      motiveSignal: input.motiveSignal,
      engineVersion,
      signalEvidence,
      observedAt,
    }),
    recordedAt: observedAt.toISOString(),
    symbol,
    motiveSignal: input.motiveSignal,
    engineVersion,
    evidence: input.evidence,
    signalEvidence,
  };
  ledger.unshift(entry);
  if (ledger.length > MAX_ENTRIES) ledger.length = MAX_ENTRIES;

  const persistence = import("@/lib/ops/durable")
    .then((m) =>
      m.persistSignalSnapshot({
        ledgerId: entry.ledgerId,
        symbol: entry.symbol,
        motiveSignal: entry.motiveSignal,
        engineVersion: entry.engineVersion,
        evidence: entry.evidence,
        signalEvidence: entry.signalEvidence,
        recordedAt: entry.recordedAt,
      })
    )
    .catch(() => undefined);
  pendingPersistence.add(persistence);
  void persistence.finally(() => pendingPersistence.delete(persistence));

  return entry;
}

export async function flushSignalEvidencePersistence(): Promise<void> {
  const pending = [...pendingPersistence];
  if (pending.length) await Promise.allSettled(pending);
}

export function getLedgerForSymbol(symbol: string, limit = 20): LedgerEntry[] {
  const s = symbol.toUpperCase();
  return ledger.filter((e) => e.symbol === s).slice(0, limit);
}

export function getLatestLedgerEntry(symbol: string): LedgerEntry | undefined {
  return getLedgerForSymbol(symbol, 1)[0];
}

/** Recent ledger entries for Truth Console (newest first). */
export function getRecentLedgerEntries(limit = 50): LedgerEntry[] {
  return ledger.slice(0, Math.max(0, limit));
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
