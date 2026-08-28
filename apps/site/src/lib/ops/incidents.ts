/**
 * Ops incidents desk — materializes Command attention into trackable incidents.
 * Dual-writes to Postgres OpsIncidentRecord.
 */

import { buildCommandAttention, type AttentionSeverity } from "./attention";
import { recordAudit } from "./audit";
import { loadIncidents, updateIncidentStatus, upsertIncident } from "./durable";

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
