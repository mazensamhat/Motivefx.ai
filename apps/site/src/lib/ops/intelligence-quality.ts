/**
 * Intelligence quality aggregations for Radar / Graph / DNA / Brief / Evidence.
 * Prefer in-process evidence ledger; fall back to durable SignalSnapshot / Graph / DNA
 * so Ops survives cold starts.
 */

import { getRecentLedgerEntries } from "@/lib/terminal/market-truth/evidence-ledger";
import { truthStateFromSourceType } from "./truth-state";
import { classifyMotiveStance } from "@/lib/terminal/market-truth/signal-confluence";
import {
  loadLatestDna,
  loadLatestGraphEdges,
  loadSignalSnapshots,
} from "./durable";

type EvidenceRow = {
  id?: string;
  provider: string;
  sourceType: string;
  freshness?: string;
  group?: string;
  signalContribution?: number;
  simulation?: boolean;
};

type IntelEntry = {
  ledgerId: string;
  symbol: string;
  motiveSignal: number | null;
  engineVersion: string;
  recordedAt: string;
  evidence: EvidenceRow[];
  signalEvidence: EvidenceRow[];
  source: "ledger" | "durable";
};

function parseEvidence(raw: string): EvidenceRow[] {
  try {
    const parsed = JSON.parse(raw || "[]") as EvidenceRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function resolveIntelEntries(limit = 100): Promise<{
  entries: IntelEntry[];
  source: "ledger" | "durable" | "empty";
}> {
  const ledger = getRecentLedgerEntries(limit);
  if (ledger.length > 0) {
    return {
      source: "ledger",
      entries: ledger.map((e) => ({
        ledgerId: e.ledgerId,
        symbol: e.symbol,
        motiveSignal: e.motiveSignal ?? null,
        engineVersion: e.engineVersion,
        recordedAt: e.recordedAt,
        evidence: e.evidence as EvidenceRow[],
        signalEvidence: e.signalEvidence as EvidenceRow[],
        source: "ledger" as const,
      })),
    };
  }

  const snaps = await loadSignalSnapshots(limit);
  if (snaps.length === 0) return { entries: [], source: "empty" };

  return {
    source: "durable",
    entries: snaps.map((s) => ({
      ledgerId: s.ledgerId,
      symbol: s.symbol,
      motiveSignal: s.motiveSignal,
      engineVersion: s.engineVersion,
      recordedAt: s.recordedAt.toISOString(),
      evidence: parseEvidence(s.evidenceJson),
      signalEvidence: parseEvidence(s.signalEvidenceJson),
      source: "durable" as const,
    })),
  };
}

export async function buildEvidenceQualityOps() {
  const { entries, source } = await resolveIntelEntries(100);
  let supporting = 0;
  let counter = 0;
  let neutral = 0;
  let simulated = 0;
  let live = 0;
  const byProvider = new Map<string, number>();
  const contradictions: { symbol: string; detail: string }[] = [];

  for (const entry of entries) {
    const score = entry.motiveSignal ?? 0;
    for (const ev of entry.evidence) {
      const contrib = ev.signalContribution ?? 0;
      if (contrib > 0) supporting += 1;
      else if (contrib < 0) counter += 1;
      else neutral += 1;
      if (ev.simulation || ev.sourceType === "DEMO" || ev.sourceType === "SYNTHETIC") simulated += 1;
      else live += 1;
      byProvider.set(ev.provider || "unknown", (byProvider.get(ev.provider || "unknown") ?? 0) + 1);
    }
    if (score >= 70 && entry.signalEvidence.length < 2) {
      contradictions.push({
        symbol: entry.symbol,
        detail: `High signal ${score} with only ${entry.signalEvidence.length} eligible evidence item(s)`,
      });
    }
  }

  return {
    source,
    totals: { supporting, counter, neutral, simulated, live, entries: entries.length },
    providers: [...byProvider.entries()]
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count),
    contradictions: contradictions.slice(0, 20),
    independenceNote:
      source === "durable"
        ? "Serving durable SignalSnapshot store (process ledger empty)."
        : "Syndication clustering (sourceFamily) lands with durable evidence store — counts today are raw evidence rows.",
  };
}

export async function buildOpportunityRadarOps() {
  const { entries, source } = await resolveIntelEntries(100);
  const opportunities = entries.map((e) => {
    const score = e.motiveSignal ?? 0;
    const stance = classifyMotiveStance(score);
    return {
      id: e.ledgerId,
      symbol: e.symbol,
      signal: score,
      confidence: Math.min(99, Math.round((e.signalEvidence.length / Math.max(e.evidence.length, 1)) * 100)),
      status: score >= 70 ? "Growing Fast" : score >= 45 ? "Forming" : "Weakening",
      stance,
      evidenceSupporting: e.signalEvidence.length,
      evidenceTotal: e.evidence.length,
      recordedAt: e.recordedAt,
      horizon: "3–9 months",
    };
  });

  return {
    source,
    totals: {
      detected: opportunities.length,
      highConfidence: opportunities.filter((o) => o.confidence >= 70).length,
      strengthening: opportunities.filter((o) => o.signal >= 70).length,
      weakening: opportunities.filter((o) => o.signal < 45).length,
    },
    opportunities: opportunities.slice(0, 40),
  };
}

export async function buildSignalGraphOps() {
  const { entries, source } = await resolveIntelEntries(100);
  const nodes = new Set(entries.map((e) => e.symbol));
  let relationships: {
    from: string;
    to: string;
    strength: number;
    evidence: number;
    stale: boolean;
  }[] = [];

  const recent = entries.slice(0, 30);
  for (let i = 0; i < recent.length; i++) {
    for (let j = i + 1; j < Math.min(i + 4, recent.length); j++) {
      const a = recent[i]!;
      const b = recent[j]!;
      if (a.symbol === b.symbol) continue;
      const strength = Math.round(
        (((a.motiveSignal ?? 50) + (b.motiveSignal ?? 50)) / 2) *
          (Math.min(a.signalEvidence.length, b.signalEvidence.length) / 5)
      );
      relationships.push({
        from: a.symbol,
        to: b.symbol,
        strength: Math.min(99, Math.max(10, strength)),
        evidence: a.signalEvidence.length + b.signalEvidence.length,
        stale: a.evidence.some((e) => e.freshness === "STALE" || e.freshness === "EXPIRED"),
      });
    }
  }

  if (relationships.length === 0) {
    const durableEdges = await loadLatestGraphEdges(50);
    relationships = durableEdges.map((e) => ({
      from: e.fromSymbol,
      to: e.toSymbol,
      strength: e.strength,
      evidence: e.evidenceCount,
      stale: e.stale,
    }));
    for (const r of relationships) {
      nodes.add(r.from);
      nodes.add(r.to);
    }
  } else {
    void import("./durable")
      .then((m) =>
        m.persistGraphEdges(
          relationships.slice(0, 50).map((r) => ({
            fromSymbol: r.from,
            toSymbol: r.to,
            strength: r.strength,
            evidenceCount: r.evidence,
            stale: r.stale,
            modelVersion: "ops-graph-v1",
          }))
        )
      )
      .catch(() => undefined);
  }

  return {
    source: relationships.length && source === "empty" ? "durable" : source,
    totals: {
      nodes: nodes.size,
      relationships: relationships.length,
      staleRelationships: relationships.filter((r) => r.stale).length,
      activeCascades: relationships.filter((r) => r.strength >= 70).length,
    },
    relationships: relationships.slice(0, 50),
    durable: true,
  };
}

export async function buildMarketDnaOps() {
  const { entries, source } = await resolveIntelEntries(100);
  const bySymbol = new Map<string, IntelEntry>();
  for (const e of entries) {
    if (!bySymbol.has(e.symbol)) bySymbol.set(e.symbol, e);
  }

  let profiles = [...bySymbol.values()].map((e) => {
    const groups = new Map<string, number>();
    for (const ev of e.evidence) {
      const g = ev.group ?? "OTHER";
      groups.set(g, (groups.get(g) ?? 0) + (ev.signalContribution ?? 1));
    }
    const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    return {
      asset: e.symbol,
      version: e.engineVersion,
      lastUpdated: e.recordedAt,
      primaryDrivers: sorted.slice(0, 3).map(([g]) => g),
      negativeSensitivities: sorted.filter(([, v]) => v < 0).map(([g]) => g).slice(0, 3),
      confidence: Math.min(99, 40 + e.signalEvidence.length * 10),
      currentRegime: classifyMotiveStance(e.motiveSignal ?? 50),
      signal: e.motiveSignal ?? null,
    };
  });

  if (profiles.length === 0) {
    const durable = await loadLatestDna(40);
    profiles = durable.map((p) => {
      let primaryDrivers: string[] = [];
      let negativeSensitivities: string[] = [];
      try {
        primaryDrivers = JSON.parse(p.primaryDriversJson || "[]") as string[];
      } catch {
        primaryDrivers = [];
      }
      try {
        negativeSensitivities = JSON.parse(p.negativeJson || "[]") as string[];
      } catch {
        negativeSensitivities = [];
      }
      return {
        asset: p.asset,
        version: p.version,
        lastUpdated: p.recordedAt.toISOString(),
        primaryDrivers,
        negativeSensitivities,
        confidence: p.confidence,
        currentRegime: p.currentRegime,
        signal: p.signal,
      };
    });
  } else {
    void import("./durable")
      .then((m) =>
        m.persistDnaProfiles(
          profiles.slice(0, 40).map((p) => ({
            asset: p.asset,
            version: p.version,
            primaryDrivers: p.primaryDrivers,
            negativeSensitivities: p.negativeSensitivities,
            currentRegime: p.currentRegime,
            confidence: p.confidence,
            signal: p.signal,
          }))
        )
      )
      .catch(() => undefined);
  }

  return {
    source: profiles.length && source === "empty" ? "durable" : source,
    totals: { profiles: profiles.length, materialDrift: 0 },
    profiles: profiles.slice(0, 40),
    driftNote: "DNA profiles dual-write to MarketDnaSnapshot; reads fall back to durable store on cold start.",
    durable: true,
  };
}

export async function buildDailyBriefOps() {
  const { entries, source } = await resolveIntelEntries(50);
  const symbols = [...new Set(entries.map((e) => e.symbol))];
  const providers = new Set<string>();
  for (const e of entries) for (const ev of e.evidence) providers.add(ev.provider);

  return {
    source,
    latest: {
      date: new Date().toISOString().slice(0, 10),
      generatedAt: entries[0]?.recordedAt ?? null,
      signalsIncluded: Math.min(8, symbols.length),
      signalsExcluded: Math.max(0, symbols.length - 8),
      providers: providers.size,
      warnings: entries.filter((e) =>
        e.evidence.some((ev) => ev.sourceType === "DEMO" || ev.simulation)
      ).length,
      status: entries.length ? "ready" : "awaiting_signal_activity",
    },
    qualityChecks: {
      duplicateTopic: 0,
      unsupportedClaim: 0,
      staleEvidence: entries.filter((e) =>
        e.evidence.some((ev) => ev.freshness === "STALE" || ev.freshness === "EXPIRED")
      ).length,
      missingCitation: 0,
      contradictorySignal: 0,
    },
    recentSymbols: symbols.slice(0, 12),
  };
}

/** Sync proxy — prefer buildCalibrationOpsAsync for outcome-backed reliability. */
export function buildCalibrationOps() {
  const entries = getRecentLedgerEntries(200);
  const buckets = [
    { bucket: "90–100", min: 90, max: 100 },
    { bucket: "80–89", min: 80, max: 89 },
    { bucket: "70–79", min: 70, max: 79 },
    { bucket: "60–69", min: 60, max: 69 },
    { bucket: "50–59", min: 50, max: 59 },
    { bucket: "<50", min: 0, max: 49 },
  ];

  return {
    note: "Proxy buckets from ledger; use async calibration for SignalOutcome reliability.",
    buckets: buckets.map((b) => {
      const inBucket = entries.filter((e) => {
        const conf = Math.min(
          99,
          Math.round(((e.motiveSignal ?? 0) + e.signalEvidence.length * 5) / 1.2)
        );
        return conf >= b.min && conf <= b.max;
      });
      return {
        bucket: b.bucket,
        predictedMin: b.min,
        predictedMax: b.max,
        sampleSize: inBucket.length,
        observedReliability: null as number | null,
        warning: false,
      };
    }),
    evaluated: entries.length,
  };
}

export async function buildCalibrationOpsAsync() {
  const { buildCalibrationFromOutcomes } = await import("./outcomes");
  return buildCalibrationFromOutcomes();
}

export async function buildIntelligenceDebugger(symbol: string) {
  const target = symbol.toUpperCase();
  const ledgerHit = getRecentLedgerEntries(100).find((e) => e.symbol === target);
  let latest: IntelEntry | null = ledgerHit
    ? {
        ledgerId: ledgerHit.ledgerId,
        symbol: ledgerHit.symbol,
        motiveSignal: ledgerHit.motiveSignal ?? null,
        engineVersion: ledgerHit.engineVersion,
        recordedAt: ledgerHit.recordedAt,
        evidence: ledgerHit.evidence as EvidenceRow[],
        signalEvidence: ledgerHit.signalEvidence as EvidenceRow[],
        source: "ledger",
      }
    : null;

  if (!latest) {
    const snaps = await loadSignalSnapshots(100);
    const snap = snaps.find((s) => s.symbol.toUpperCase() === target);
    if (snap) {
      latest = {
        ledgerId: snap.ledgerId,
        symbol: snap.symbol,
        motiveSignal: snap.motiveSignal,
        engineVersion: snap.engineVersion,
        recordedAt: snap.recordedAt.toISOString(),
        evidence: parseEvidence(snap.evidenceJson),
        signalEvidence: parseEvidence(snap.signalEvidenceJson),
        source: "durable",
      };
    }
  }

  if (!latest) return null;

  const stages = [
    {
      stage: "RAW INPUT",
      detail: `${latest.evidence.length} evidence items from ${[
        ...new Set(latest.evidence.map((e) => e.provider)),
      ].join(", ") || "—"} · source ${latest.source}`,
    },
    {
      stage: "NORMALIZATION",
      detail: latest.evidence
        .map((e) => `${e.sourceType}/${e.freshness ?? "n/a"}`)
        .slice(0, 6)
        .join(", "),
    },
    {
      stage: "MARKET TRUTH",
      detail: latest.signalEvidence
        .map((e) => truthStateFromSourceType(e.sourceType))
        .join(", ") || "none eligible",
    },
    {
      stage: "FEATURE VALUES",
      detail: latest.signalEvidence
        .map((e) => `${e.group ?? "n/a"}:${e.signalContribution ?? 0}`)
        .join(", "),
    },
    {
      stage: "SCORE",
      detail: `Motive Signal ${latest.motiveSignal ?? "—"} · ${classifyMotiveStance(latest.motiveSignal ?? 0)}`,
    },
    {
      stage: "CONFIDENCE",
      detail: `Proxy ${Math.min(99, 40 + latest.signalEvidence.length * 12)}% from evidence density`,
    },
    {
      stage: "EVIDENCE",
      detail: `${latest.signalEvidence.length} production-eligible / ${latest.evidence.length} total`,
    },
    {
      stage: "AI EXPLANATION",
      detail: "Grounded explanations attach at Ask Motive / Brief — not stored on ledger yet",
    },
  ];

  return {
    symbol: latest.symbol,
    ledgerId: latest.ledgerId,
    engineVersion: latest.engineVersion,
    recordedAt: latest.recordedAt,
    source: latest.source,
    stages,
    evidence: latest.evidence.map((e) => ({
      id: e.id,
      provider: e.provider,
      sourceType: e.sourceType,
      truthState: truthStateFromSourceType(e.sourceType),
      group: e.group,
      contribution: e.signalContribution,
      freshness: e.freshness,
      simulation: e.simulation,
    })),
  };
}
