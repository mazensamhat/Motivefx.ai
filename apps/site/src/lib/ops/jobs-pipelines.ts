/**
 * Background jobs + pipeline monitoring — derived from durable Ops stores.
 * No fabricated timestamps: missing activity surfaces as never-run / empty.
 */

import { prisma } from "@motivefx/database";
import { loadIncidents, loadRecentTelemetry, loadSignalSnapshots } from "./durable";

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
  source: "durable" | "none";
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
  source: "telemetry" | "empty";
};

function isoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function listOpsJobs(): Promise<OpsJob[]> {
  const [snaps, telemetry, incidents, replays, aiLast] = await Promise.all([
    loadSignalSnapshots(1),
    loadRecentTelemetry(80),
    loadIncidents(20),
    prisma.opsReplayJob
      .findMany({ orderBy: { createdAt: "desc" }, take: 1 })
      .catch(() => []),
    prisma.opsAiUsage
      .findFirst({ orderBy: { createdAt: "desc" } })
      .catch(() => null),
  ]);

  const lastSnap = snaps[0];
  const providerEvents = telemetry.filter((e) => e.provider);
  const lastProvider = providerEvents[0];
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "acknowledged");
  const lastReplay = Array.isArray(replays) ? replays[0] : null;

  const jobs: OpsJob[] = [
    {
      id: "signal-generation",
      label: "Signal snapshot persistence",
      lastRun: isoOrNull(lastSnap?.recordedAt),
      nextRun: null,
      durationMs: null,
      success: lastSnap ? true : null,
      retries: 0,
      failure: lastSnap ? null : "No SignalSnapshot rows yet",
      domain: "signal",
      source: lastSnap ? "durable" : "none",
    },
    {
      id: "provider-ingestion",
      label: "Provider telemetry",
      lastRun: lastProvider?.observedAt ?? null,
      nextRun: null,
      durationMs: lastProvider?.durationMs ?? null,
      success: lastProvider ? lastProvider.status !== "error" : null,
      retries: 0,
      failure: lastProvider?.errorCode ?? (lastProvider ? null : "No provider telemetry yet"),
      domain: "data",
      source: lastProvider ? "durable" : "none",
    },
    {
      id: "ai-usage",
      label: "AI metering",
      lastRun: isoOrNull(aiLast?.createdAt),
      nextRun: null,
      durationMs: aiLast?.durationMs ?? null,
      success: aiLast ? aiLast.status === "ok" : null,
      retries: 0,
      failure: aiLast ? null : "No OpsAiUsage rows yet",
      domain: "ai",
      source: aiLast ? "durable" : "none",
    },
    {
      id: "historical-replay",
      label: "Historical replay jobs",
      lastRun: isoOrNull(lastReplay?.completedAt ?? lastReplay?.startedAt ?? lastReplay?.createdAt),
      nextRun: null,
      durationMs: null,
      success: lastReplay ? lastReplay.status === "completed" : null,
      retries: 0,
      failure: lastReplay?.status === "failed" ? "Last replay failed" : lastReplay ? null : "No replay jobs yet",
      domain: "replay",
      source: lastReplay ? "durable" : "none",
    },
    {
      id: "incident-desk",
      label: "Incident desk",
      lastRun: openIncidents[0] ? isoOrNull(openIncidents[0].lastSeen) : isoOrNull(incidents[0]?.lastSeen),
      nextRun: null,
      durationMs: null,
      success: openIncidents.length === 0,
      retries: 0,
      failure: openIncidents.length ? `${openIncidents.length} open incident(s)` : null,
      domain: "platform",
      source: incidents.length ? "durable" : "none",
    },
  ];

  return jobs;
}

export async function listPipelineStats(): Promise<PipelineStats[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let rows: {
    provider: string | null;
    desk: string | null;
    status: string | null;
    durationMs: number | null;
    truthState: string | null;
  }[] = [];
  try {
    rows = await prisma.opsTelemetryEvent.findMany({
      where: { observedAt: { gte: since } },
      select: {
        provider: true,
        desk: true,
        status: true,
        durationMs: true,
        truthState: true,
      },
      take: 2000,
    });
  } catch {
    rows = [];
  }

  const buckets = new Map<
    string,
    {
      label: string;
      raw: number;
      ok: number;
      err: number;
      stale: number;
      durations: number[];
    }
  >();

  const ensure = (id: string, label: string) => {
    if (!buckets.has(id)) {
      buckets.set(id, { label, raw: 0, ok: 0, err: 0, stale: 0, durations: [] });
    }
    return buckets.get(id)!;
  };

  for (const r of rows) {
    const id = (r.desk || r.provider || "platform").toLowerCase();
    const label = r.desk || r.provider || "Platform";
    const b = ensure(id, label);
    b.raw += 1;
    if (r.status === "error" || r.status === "fail") b.err += 1;
    else b.ok += 1;
    if (r.truthState === "STALE" || r.truthState === "EXPIRED") b.stale += 1;
    if (typeof r.durationMs === "number") b.durations.push(r.durationMs);
  }

  if (buckets.size === 0) {
    return [
      {
        id: "telemetry",
        label: "Ops telemetry (24h)",
        rawRecords: 0,
        normalized: 0,
        accepted: 0,
        rejected: 0,
        duplicates: 0,
        stale: 0,
        schemaFailures: 0,
        latencyMs: null,
        deadLetter: 0,
        source: "empty",
      },
    ];
  }

  return [...buckets.entries()].map(([id, b]) => {
    const sorted = [...b.durations].sort((a, c) => a - c);
    const p95 =
      sorted.length > 0 ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]! : null;
    return {
      id,
      label: b.label,
      rawRecords: b.raw,
      normalized: b.raw,
      accepted: b.ok,
      rejected: b.err,
      duplicates: 0,
      stale: b.stale,
      schemaFailures: 0,
      latencyMs: p95,
      deadLetter: b.err,
      source: "telemetry" as const,
    };
  });
}
