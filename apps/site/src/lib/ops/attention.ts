/**
 * Command Center attention builder (Ops Master Plan §11).
 * Aggregates provider / market-truth / signal health into actionable items.
 */

import { ledgerContaminationStats, getRecentLedgerEntries } from "@/lib/terminal/market-truth/evidence-ledger";
import { runMarketTruthGoldenChecks } from "@/lib/terminal/market-truth/golden";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import { providerHealthFlags } from "@/lib/terminal/provider-switches";
import { getPlatformMonitorSnapshot } from "@/lib/platform-monitor";
import { listSourceRights } from "./source-rights";
import { telemetryInstrumentationStats } from "./telemetry-envelope";
import {
  buildDailyBriefOps,
  buildMarketDnaOps,
  buildOpportunityRadarOps,
  buildSignalGraphOps,
} from "./intelligence-quality";

function intelStatusFromActivity(opts: {
  count: number;
  hasContamination: boolean;
}): IntelligenceHealth["status"] {
  if (opts.hasContamination) return "critical";
  if (opts.count <= 0) return "degraded";
  return "healthy";
}

export type AttentionSeverity = "info" | "warning" | "high" | "critical" | "ok";

export type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  domain: string;
  title: string;
  detail?: string;
  href?: string;
};

export type IntelligenceHealth = {
  id: string;
  label: string;
  status: "healthy" | "degraded" | "critical" | "unknown";
  href: string;
};

export type CommandAttentionPayload = {
  generatedAt: string;
  environment: string;
  dataMode: string;
  overall: "healthy" | "degraded" | "critical";
  attentionCount: number;
  items: AttentionItem[];
  intelligence: IntelligenceHealth[];
  telemetry: { buffered: number; withErrors: number };
};

export async function buildCommandAttention(): Promise<CommandAttentionPayload> {
  const items: AttentionItem[] = [];
  const contamination = ledgerContaminationStats();
  const golden = runMarketTruthGoldenChecks();
  const dataMode = getDataMode();
  const kill = providerHealthFlags();
  const platforms = await getPlatformMonitorSnapshot();
  const telemetry = telemetryInstrumentationStats();

  if (contamination.demoInSignal > 0 || contamination.syntheticInSignal > 0) {
    items.push({
      id: "demo-in-signal",
      severity: "critical",
      domain: "market-truth",
      title: "Demo/simulated evidence in Motive Signal path",
      detail: `Demo: ${contamination.demoInSignal} · Synthetic: ${contamination.syntheticInSignal}`,
      href: "/admin/market-truth",
    });
  }

  if (!golden.ok) {
    const failed = Object.entries(golden.checks)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    items.push({
      id: "golden-fail",
      severity: "high",
      domain: "market-truth",
      title: "Market Truth golden checks failing",
      detail: failed.join(", ") || "unknown",
      href: "/admin/market-truth",
    });
  }

  for (const [id, enabled] of Object.entries(kill)) {
    if (!enabled) {
      items.push({
        id: `kill-${id}`,
        severity: "warning",
        domain: "providers",
        title: `Provider kill switch off: ${id}`,
        href: "/admin/providers",
      });
    }
  }

  for (const p of platforms.platforms) {
    if (p.status === "error") {
      items.push({
        id: `platform-${p.id}`,
        severity: "high",
        domain: "platform",
        title: `${p.name} degraded`,
        detail: p.summary,
        href: "/admin/overview",
      });
    } else if (p.status === "warn") {
      items.push({
        id: `platform-${p.id}`,
        severity: "warning",
        domain: "platform",
        title: `${p.name} warning`,
        detail: p.summary,
        href: "/admin/overview",
      });
    }
  }

  // Unknown rights only surface when someone queries an unregistered provider —
  // seeded registry is fully known; keep as informational telemetry only.
  void listSourceRights;

  if (telemetry.withErrors > 0) {
    items.push({
      id: "telemetry-unknown",
      severity: "info",
      domain: "telemetry",
      title: `${telemetry.withErrors} telemetry events with UNKNOWN registry values`,
      href: "/admin/overview",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "all-clear",
      severity: "ok",
      domain: "command",
      title: "Nothing requires immediate intervention",
      detail: "Markets, truth gates, and platforms look healthy",
    });
  }

  const hasCritical = items.some((i) => i.severity === "critical");
  const hasHigh = items.some((i) => i.severity === "high" || i.severity === "warning");
  const overall = hasCritical ? "critical" : hasHigh ? "degraded" : "healthy";

  const truthOk =
    golden.ok && contamination.demoInSignal === 0 && contamination.syntheticInSignal === 0;
  const hasContamination =
    contamination.demoInSignal > 0 || contamination.syntheticInSignal > 0;

  const radar = buildOpportunityRadarOps();
  const graph = buildSignalGraphOps();
  const dna = buildMarketDnaOps();
  const brief = buildDailyBriefOps();
  const ledgerCount = getRecentLedgerEntries(20).length;
  let durableSnapCount = 0;
  try {
    const { loadSignalSnapshots } = await import("./durable");
    durableSnapCount = (await loadSignalSnapshots(20)).length;
  } catch {
    durableSnapCount = 0;
  }
  const activityCount = Math.max(ledgerCount, durableSnapCount, radar.totals.detected);

  const intelligence: IntelligenceHealth[] = [
    {
      id: "market-truth",
      label: "Market Truth",
      status: truthOk ? "healthy" : "critical",
      href: "/admin/market-truth",
    },
    {
      id: "motive-signal",
      label: "Motive Signal",
      status: truthOk ? (activityCount > 0 ? "healthy" : "degraded") : "degraded",
      href: "/admin/signals",
    },
    {
      id: "opportunity-radar",
      label: "Opportunity Radar",
      status: intelStatusFromActivity({
        count: Math.max(radar.totals.detected, durableSnapCount),
        hasContamination,
      }),
      href: "/admin/opportunity-radar",
    },
    {
      id: "signal-graph",
      label: "Signal Graph",
      status: intelStatusFromActivity({
        count: Math.max(graph.totals.relationships, durableSnapCount > 1 ? durableSnapCount : 0),
        hasContamination,
      }),
      href: "/admin/signal-graph",
    },
    {
      id: "market-dna",
      label: "Market DNA",
      status: intelStatusFromActivity({
        count: Math.max(dna.totals.profiles, durableSnapCount),
        hasContamination,
      }),
      href: "/admin/market-dna",
    },
    {
      id: "daily-brief",
      label: "Daily Brief",
      status: hasContamination
        ? "critical"
        : brief.latest.status === "ready" || durableSnapCount > 0
          ? "healthy"
          : "degraded",
      href: "/admin/daily-brief",
    },
  ];

  const attentionCount = items.filter((i) => i.severity !== "ok").length;

  return {
    generatedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    dataMode,
    overall,
    attentionCount,
    items,
    intelligence,
    telemetry,
  };
}
