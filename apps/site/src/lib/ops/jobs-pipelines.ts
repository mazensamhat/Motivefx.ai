/**
 * Background jobs + pipeline monitoring contracts (Ops Master Plan §80–81).
 */

export type OpsJob = {
  id: string;
  label: string;
  lastRun: string | null;
  nextRun: string | null;
  durationMs: number | null;
  success: boolean | null;
  retries: number;
  failure: string | null;
  domain: string;
};

export type PipelineStats = {
  id: string;
  label: string;
  rawRecords: number;
  normalized: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  stale: number;
  schemaFailures: number;
  latencyMs: number | null;
  deadLetter: number;
};

export function listOpsJobs(): OpsJob[] {
  const now = Date.now();
  const ago = (m: number) => new Date(now - m * 60_000).toISOString();
  const next = (m: number) => new Date(now + m * 60_000).toISOString();

  return [
    {
      id: "daily-brief",
      label: "Daily Brief generation",
      lastRun: ago(180),
      nextRun: next(300),
      durationMs: 15200,
      success: true,
      retries: 0,
      failure: null,
      domain: "brief",
    },
    {
      id: "signal-generation",
      label: "Signal generation",
      lastRun: ago(5),
      nextRun: next(5),
      durationMs: 820,
      success: true,
      retries: 0,
      failure: null,
      domain: "signal",
    },
    {
      id: "radar-refresh",
      label: "Radar refresh",
      lastRun: ago(12),
      nextRun: next(18),
      durationMs: 2100,
      success: true,
      retries: 0,
      failure: null,
      domain: "radar",
    },
    {
      id: "market-dna-refresh",
      label: "Market DNA refresh",
      lastRun: ago(45),
      nextRun: next(75),
      durationMs: 4400,
      success: true,
      retries: 0,
      failure: null,
      domain: "dna",
    },
    {
      id: "provider-reconciliation",
      label: "Provider reconciliation",
      lastRun: ago(8),
      nextRun: next(22),
      durationMs: 1200,
      success: true,
      retries: 0,
      failure: null,
      domain: "data",
    },
    {
      id: "alert-generation",
      label: "Alert generation",
      lastRun: ago(3),
      nextRun: next(7),
      durationMs: 400,
      success: true,
      retries: 0,
      failure: null,
      domain: "alerts",
    },
    {
      id: "cleanup",
      label: "Cleanup",
      lastRun: ago(360),
      nextRun: next(120),
      durationMs: 900,
      success: true,
      retries: 0,
      failure: null,
      domain: "platform",
    },
  ];
}

export function listPipelineStats(): PipelineStats[] {
  return [
    {
      id: "equity-quotes",
      label: "Equity quotes",
      rawRecords: 81442,
      normalized: 81390,
      accepted: 81210,
      rejected: 180,
      duplicates: 52,
      stale: 24,
      schemaFailures: 6,
      latencyMs: 284,
      deadLetter: 2,
    },
    {
      id: "crypto",
      label: "Crypto feeds",
      rawRecords: 42100,
      normalized: 42050,
      accepted: 41980,
      rejected: 70,
      duplicates: 30,
      stale: 12,
      schemaFailures: 2,
      latencyMs: 190,
      deadLetter: 0,
    },
    {
      id: "predictions",
      label: "Prediction markets",
      rawRecords: 9800,
      normalized: 9780,
      accepted: 9740,
      rejected: 40,
      duplicates: 10,
      stale: 8,
      schemaFailures: 1,
      latencyMs: 320,
      deadLetter: 1,
    },
    {
      id: "sports-odds",
      label: "Sports odds",
      rawRecords: 15200,
      normalized: 15140,
      accepted: 15090,
      rejected: 50,
      duplicates: 20,
      stale: 15,
      schemaFailures: 3,
      latencyMs: 410,
      deadLetter: 0,
    },
  ];
}
