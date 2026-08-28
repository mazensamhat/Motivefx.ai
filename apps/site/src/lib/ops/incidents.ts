/**
 * Ops incidents desk — materializes Command attention into trackable incidents.
 */

import { buildCommandAttention, type AttentionSeverity } from "./attention";
import { recordAudit } from "./audit";

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

const acknowledgements = new Map<string, { status: IncidentStatus; at: string; by: string }>();

function mapSeverity(s: AttentionSeverity): IncidentSeverity {
  if (s === "critical") return "CRITICAL";
  if (s === "high") return "HIGH";
  if (s === "warning") return "WARNING";
  return "INFO";
}

export async function listOpsIncidents(): Promise<OpsIncident[]> {
  const attention = await buildCommandAttention();
  const now = attention.generatedAt;

  return attention.items
    .filter((i) => i.severity !== "ok")
    .map((item) => {
      const ack = acknowledgements.get(item.id);
      return {
        id: item.id,
        severity: mapSeverity(item.severity),
        domain: item.domain,
        title: item.title,
        description: item.detail ?? "",
        firstSeen: now,
        lastSeen: now,
        status: ack?.status ?? "open",
        source: "command-attention",
        href: item.href,
        runbook:
          item.domain === "providers"
            ? "Check kill switch env · provider dashboard · failover"
            : item.domain === "market-truth"
              ? "Open Market Truth · inspect contamination · suppress demo"
              : "Investigate via Live Ops and related Ops page",
      };
    });
}

export function acknowledgeIncident(input: {
  incidentId: string;
  actorId: string;
  actorEmail: string;
  status?: IncidentStatus;
}): boolean {
  const status = input.status ?? "acknowledged";
  acknowledgements.set(input.incidentId, {
    status,
    at: new Date().toISOString(),
    by: input.actorEmail,
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
