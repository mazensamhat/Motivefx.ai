/**
 * Ops incidents desk — materializes Command attention into trackable incidents.
 * Dual-writes to Postgres OpsIncidentRecord.
 */

import { buildCommandAttention, type AttentionSeverity } from "./attention";
import { recordAudit } from "./audit";
import { loadIncidents, loadRecentTelemetry, updateIncidentStatus, upsertIncident } from "./durable";

export type IncidentSeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";

export type IncidentStatus = "open" | "acknowledged" | "investigating" | "resolved";

export type OpsIncident = {
  id: string;
  severity: IncidentSeverity;
  domain: string;
  title: string;
  description: string;
  firstSeen: string;
  lastSeen: string;
  status: IncidentStatus;
  source: string;
  href?: string;
  affectedUsers?: number;
  provider?: string;
  runbook?: string;
};

function mapSeverity(s: AttentionSeverity): IncidentSeverity {
  if (s === "critical") return "CRITICAL";
  if (s === "high") return "HIGH";
  if (s === "warning") return "WARNING";
  return "INFO";
}

export type OpsRiskForecast = {
  id: string;
  severity: "WARNING" | "HIGH";
  domain: string;
  title: string;
  reason: string;
  confidence: number;
  samples: number;
  errorRatePct: number;
  staleRatePct: number;
  lastObservedAt: string;
};

export async function forecastOpsRisks(hours = 6): Promise<OpsRiskForecast[]> {
  const rows = await loadRecentTelemetry(500);
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const recent = rows.filter((row) => {
    const at = Date.parse(row.observedAt);
    return Number.isFinite(at) && at >= cutoff;
  });

  type Bucket = {
    domain: string;
    samples: number;
    errors: number;
    stale: number;
    lastObservedAt: string;
  };

  const buckets = new Map<string, Bucket>();
  for (const row of recent) {
    const provider = row.provider?.trim();
    const desk = row.desk?.trim();
    const domain = provider ? `provider:${provider}` : desk ? `desk:${desk}` : "platform";
    const bucket = buckets.get(domain) ?? {
      domain,
      samples: 0,
      errors: 0,
      stale: 0,
      lastObservedAt: row.observedAt,
    };
    bucket.samples += 1;
    if (row.status === "error" || row.status === "timeout") bucket.errors += 1;
    if (row.truthState === "STALE" || row.truthState === "UNAVAILABLE") bucket.stale += 1;
    if (row.observedAt > bucket.lastObservedAt) bucket.lastObservedAt = row.observedAt;
    buckets.set(domain, bucket);
  }

  const forecasts: OpsRiskForecast[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.samples < 5) continue;
    const errorRatePct = Math.round((bucket.errors / bucket.samples) * 1000) / 10;
    const staleRatePct = Math.round((bucket.stale / bucket.samples) * 1000) / 10;
    if (errorRatePct < 15 && staleRatePct < 30) continue;

    const severity: "WARNING" | "HIGH" =
      errorRatePct >= 40 || staleRatePct >= 60 ? "HIGH" : "WARNING";
    const confidence = Math.min(
      95,
      Math.round(45 + Math.min(bucket.samples, 50) * 0.8 + Math.max(errorRatePct, staleRatePct) * 0.3)
    );
    const display = bucket.domain.replace(/^provider:/, "").replace(/^desk:/, "");

    forecasts.push({
      id: `forecast:${bucket.domain}`,
      severity,
      domain: bucket.domain,
      title: `${display} degradation risk`,
      reason:
        `${bucket.samples} telemetry samples in ${hours}h · ${errorRatePct}% errors · ${staleRatePct}% stale/expired`,
      confidence,
      samples: bucket.samples,
      errorRatePct,
      staleRatePct,
      lastObservedAt: bucket.lastObservedAt,
    });
  }

  return forecasts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "HIGH" ? -1 : 1;
    return b.confidence - a.confidence;
  });
}

export async function listOpsIncidents(): Promise<OpsIncident[]> {
  const attention = await buildCommandAttention();
  const now = attention.generatedAt;

  const live = attention.items
    .filter((i) => i.severity !== "ok")
    .map((item) => {
      const severity = mapSeverity(item.severity);
      const runbook =
        item.domain === "providers"
          ? "Check kill switch env · provider dashboard · failover"
          : item.domain === "market-truth"
            ? "Open Market Truth · inspect contamination · suppress demo"
            : "Investigate via Live Ops and related Ops page";
      void upsertIncident({
        id: item.id,
        severity,
        domain: item.domain,
        title: item.title,
        description: item.detail ?? "",
        href: item.href,
        runbook,
        source: "command-attention",
      });
      return {
        id: item.id,
        severity,
        domain: item.domain,
        title: item.title,
        description: item.detail ?? "",
        firstSeen: now,
        lastSeen: now,
        status: "open" as IncidentStatus,
        source: "command-attention",
        href: item.href,
        runbook,
      };
    });

  const durable = await loadIncidents(100);
  const byId = new Map<string, OpsIncident>();

  for (const row of durable) {
    byId.set(row.id, {
      id: row.id,
      severity: row.severity as IncidentSeverity,
      domain: row.domain,
      title: row.title,
      description: row.description,
      firstSeen: row.firstSeen.toISOString(),
      lastSeen: row.lastSeen.toISOString(),
      status: row.status as IncidentStatus,
      source: row.source,
      href: row.href ?? undefined,
      runbook: row.runbook ?? undefined,
    });
  }
  for (const item of live) {
    const existing = byId.get(item.id);
    if (existing) {
      byId.set(item.id, {
        ...existing,
        severity: item.severity,
        title: item.title,
        description: item.description,
        lastSeen: item.lastSeen,
        href: item.href,
        runbook: item.runbook,
        status: existing.status === "resolved" ? "open" : existing.status,
      });
    } else {
      byId.set(item.id, item);
    }
  }

  return [...byId.values()].sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
}

export function acknowledgeIncident(input: {
  incidentId: string;
  actorId: string;
  actorEmail: string;
  status?: IncidentStatus;
}): boolean {
  const status = input.status ?? "acknowledged";
  void updateIncidentStatus({
    id: input.incidentId,
    status,
    actorEmail: input.actorEmail,
  });
  recordAudit({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: "ops.incident.acknowledge",
    targetType: "incident",
    targetId: input.incidentId,
    result: "success",
    after: { status },
  });
  return true;
}
