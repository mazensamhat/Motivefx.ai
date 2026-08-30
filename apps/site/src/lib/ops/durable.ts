/**
 * Durable Ops persistence — Postgres via Prisma.
 * Dual-writes with in-process rings so Live Ops stays fast on cold starts.
 */

import { prisma } from "@motivefx/database";
import type { TelemetryEnvelope } from "./telemetry-envelope";
import type { AuditRecord } from "./audit";
import { classifyMotiveStance } from "@/lib/terminal/market-truth/signal-confluence";

export async function persistTelemetry(envelope: TelemetryEnvelope): Promise<void> {
  try {
    await prisma.opsTelemetryEvent.create({
      data: {
        eventId: envelope.eventId,
        eventName: envelope.eventName,
        version: envelope.version,
        userId: envelope.userId,
        sessionId: envelope.sessionId,
        product: envelope.product,
        desk: envelope.desk,
        symbol: envelope.symbol,
        themeId: envelope.themeId,
        signalId: envelope.signalId,
        opportunityId: envelope.opportunityId,
        provider: envelope.provider,
        environment: envelope.environment,
        platform: envelope.platform,
        appVersion: envelope.appVersion,
        observedAt: new Date(envelope.observedAt),
        durationMs: envelope.durationMs,
        status: envelope.status,
        errorCode: envelope.errorCode,
        metadataJson: JSON.stringify(envelope.metadata ?? {}),
        sourceClass: envelope.sourceClass,
        privacyClass: envelope.privacyClass,
        truthState: envelope.truthState,
        instrumentationJson: JSON.stringify(envelope.instrumentationErrors ?? []),
      },
    });
  } catch (e) {
    console.warn("[ops/durable] telemetry persist failed", e);
  }
}

export async function loadRecentTelemetry(limit = 50): Promise<TelemetryEnvelope[]> {
  try {
    const rows = await prisma.opsTelemetryEvent.findMany({
      orderBy: { observedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      eventId: r.eventId,
      eventName: r.eventName as TelemetryEnvelope["eventName"],
      version: r.version,
      userId: r.userId ?? undefined,
      sessionId: r.sessionId ?? undefined,
      product: (r.product as TelemetryEnvelope["product"]) ?? undefined,
      desk: (r.desk as TelemetryEnvelope["desk"]) ?? undefined,
      symbol: r.symbol ?? undefined,
      themeId: r.themeId ?? undefined,
      signalId: r.signalId ?? undefined,
      opportunityId: r.opportunityId ?? undefined,
      provider: r.provider ?? undefined,
      environment: r.environment,
      platform: r.platform ?? undefined,
      appVersion: r.appVersion ?? undefined,
      observedAt: r.observedAt.toISOString(),
      ingestedAt: r.ingestedAt.toISOString(),
      durationMs: r.durationMs ?? undefined,
      status: (r.status as TelemetryEnvelope["status"]) ?? undefined,
      errorCode: r.errorCode ?? undefined,
      metadata: JSON.parse(r.metadataJson || "{}") as Record<string, unknown>,
      sourceClass: r.sourceClass as TelemetryEnvelope["sourceClass"],
      privacyClass: r.privacyClass as TelemetryEnvelope["privacyClass"],
      truthState: (r.truthState as TelemetryEnvelope["truthState"]) ?? undefined,
      instrumentationErrors: JSON.parse(r.instrumentationJson || "[]") as string[],
    }));
  } catch (e) {
    console.warn("[ops/durable] telemetry load failed", e);
    return [];
  }
}

export async function persistAudit(record: AuditRecord): Promise<void> {
  try {
    await prisma.opsAuditEvent.create({
      data: {
        id: record.id,
        actorId: record.actorId,
        actorEmail: record.actorEmail,
        action: record.action,
        capability: record.capability,
        risk: record.risk,
        targetType: record.targetType,
        targetId: record.targetId,
        reason: record.reason,
        beforeJson: record.before != null ? JSON.stringify(record.before) : null,
        afterJson: record.after != null ? JSON.stringify(record.after) : null,
        result: record.result,
        environment: record.environment,
        requestId: record.requestId,
        observedAt: new Date(record.observedAt),
      },
    });
  } catch (e) {
    console.warn("[ops/durable] audit persist failed", e);
  }
}

export async function loadRecentAudit(limit = 50): Promise<AuditRecord[]> {
  try {
    const rows = await prisma.opsAuditEvent.findMany({
      orderBy: { observedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      actorEmail: r.actorEmail,
      action: r.action,
      capability: r.capability as AuditRecord["capability"],
      risk: r.risk as AuditRecord["risk"],
      targetType: r.targetType ?? undefined,
      targetId: r.targetId ?? undefined,
      reason: r.reason ?? undefined,
      before: r.beforeJson ? JSON.parse(r.beforeJson) : undefined,
      after: r.afterJson ? JSON.parse(r.afterJson) : undefined,
      result: r.result as AuditRecord["result"],
      environment: r.environment,
      requestId: r.requestId ?? undefined,
      observedAt: r.observedAt.toISOString(),
    }));
  } catch (e) {
    console.warn("[ops/durable] audit load failed", e);
    return [];
  }
}

export type AiUsageInput = {
  userId?: string;
  feature: string;
  model: string;
  promptVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  status?: string;
  grounding?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
};

/** Rough USD estimate — gpt-4o-mini-ish rates; override via MOTIVEFX_AI_INPUT_COST_PER_1M / OUTPUT. */
function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const inPer1m = Number(process.env.MOTIVEFX_AI_INPUT_COST_PER_1M ?? 0.15);
  const outPer1m = Number(process.env.MOTIVEFX_AI_OUTPUT_COST_PER_1M ?? 0.6);
  return (inputTokens / 1_000_000) * inPer1m + (outputTokens / 1_000_000) * outPer1m;
}

export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  try {
    await prisma.opsAiUsage.create({
      data: {
        userId: input.userId,
        feature: input.feature,
        model: input.model,
        promptVersion: input.promptVersion,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
        durationMs: input.durationMs,
        status: input.status ?? "ok",
        grounding: input.grounding,
        errorCode: input.errorCode,
        metadataJson: JSON.stringify(input.metadata ?? {}),
      },
    });
  } catch (e) {
    console.warn("[ops/durable] ai usage persist failed", e);
  }
}

export async function getAiUsageSummary(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  try {
    const rows = await prisma.opsAiUsage.findMany({
      where: { createdAt: { gte: since } },
      select: {
        feature: true,
        model: true,
        userId: true,
        totalTokens: true,
        estimatedCostUsd: true,
        status: true,
      },
    });
    const totalCost = rows.reduce((s, r) => s + r.estimatedCostUsd, 0);
    const totalTokens = rows.reduce((s, r) => s + r.totalTokens, 0);
    const byFeature = new Map<string, { tokens: number; cost: number; count: number }>();
    const users = new Set<string>();
    for (const r of rows) {
      if (r.userId) users.add(r.userId);
      const cur = byFeature.get(r.feature) ?? { tokens: 0, cost: 0, count: 0 };
      cur.tokens += r.totalTokens;
      cur.cost += r.estimatedCostUsd;
      cur.count += 1;
      byFeature.set(r.feature, cur);
    }
    return {
      days,
      requests: rows.length,
      totalTokens,
      totalCostUsd: Math.round(totalCost * 10000) / 10000,
      uniqueUsers: users.size,
      costPerUser: users.size ? Math.round((totalCost / users.size) * 10000) / 10000 : 0,
      byFeature: [...byFeature.entries()].map(([feature, v]) => ({
        feature,
        ...v,
        cost: Math.round(v.cost * 10000) / 10000,
      })),
      successRate:
        rows.length === 0
          ? 100
          : Math.round((rows.filter((r) => r.status === "ok").length / rows.length) * 1000) / 10,
    };
  } catch (e) {
    console.warn("[ops/durable] ai summary failed", e);
    return {
      days,
      requests: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      uniqueUsers: 0,
      costPerUser: 0,
      byFeature: [] as { feature: string; tokens: number; cost: number; count: number }[],
      successRate: 100,
    };
  }
}

export async function persistSignalSnapshot(input: {
  ledgerId: string;
  symbol: string;
  motiveSignal?: number;
  engineVersion: string;
  evidence: unknown[];
  signalEvidence: unknown[];
  recordedAt: string;
}): Promise<void> {
  const score = input.motiveSignal ?? 0;
  const conf = Math.min(99, 40 + input.signalEvidence.length * 12);
  try {
    await prisma.signalSnapshot.upsert({
      where: { ledgerId: input.ledgerId },
      create: {
        ledgerId: input.ledgerId,
        symbol: input.symbol,
        motiveSignal: input.motiveSignal,
        confidence: conf,
        stance: classifyMotiveStance(score),
        engineVersion: input.engineVersion,
        evidenceJson: JSON.stringify(input.evidence),
        signalEvidenceJson: JSON.stringify(input.signalEvidence),
        evidenceCount: input.evidence.length,
        signalEvidenceCount: input.signalEvidence.length,
        recordedAt: new Date(input.recordedAt),
      },
      update: {
        motiveSignal: input.motiveSignal,
        confidence: conf,
        stance: classifyMotiveStance(score),
        evidenceJson: JSON.stringify(input.evidence),
        signalEvidenceJson: JSON.stringify(input.signalEvidence),
        evidenceCount: input.evidence.length,
        signalEvidenceCount: input.signalEvidence.length,
      },
    });

    // Seed pending outcome for calibration horizon
    const snap = await prisma.signalSnapshot.findUnique({ where: { ledgerId: input.ledgerId } });
    if (snap) {
      const existing = await prisma.signalOutcome.count({ where: { snapshotId: snap.id } });
      if (existing === 0 && input.motiveSignal != null) {
        await prisma.signalOutcome.create({
          data: {
            snapshotId: snap.id,
            symbol: input.symbol,
            claim: `${input.symbol} Motive Signal ${input.motiveSignal} (${classifyMotiveStance(score)})`,
            horizonDays: 30,
            predictedScore: input.motiveSignal,
            predictedConf: conf,
            outcome: "PENDING",
          },
        });
      }
    }
  } catch (e) {
    console.warn("[ops/durable] signal snapshot failed", e);
  }
}

export async function loadSignalSnapshots(limit = 100) {
  try {
    return await prisma.signalSnapshot.findMany({
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function persistGraphEdges(
  edges: {
    fromSymbol: string;
    toSymbol: string;
    strength: number;
    evidenceCount: number;
    stale: boolean;
    modelVersion: string;
  }[]
): Promise<void> {
  if (!edges.length) return;
  try {
    await prisma.signalGraphEdge.createMany({
      data: edges.map((e) => ({
        fromSymbol: e.fromSymbol,
        toSymbol: e.toSymbol,
        strength: e.strength,
        evidenceCount: e.evidenceCount,
        stale: e.stale,
        modelVersion: e.modelVersion,
      })),
    });
  } catch (e) {
    console.warn("[ops/durable] graph edges failed", e);
  }
}

export async function persistDnaProfiles(
  profiles: {
    asset: string;
    version: string;
    primaryDrivers: string[];
    negativeSensitivities: string[];
    currentRegime: string;
    confidence: number;
    signal: number | null;
  }[]
): Promise<void> {
  if (!profiles.length) return;
  try {
    await prisma.marketDnaSnapshot.createMany({
      data: profiles.map((p) => ({
        asset: p.asset,
        version: p.version,
        primaryDriversJson: JSON.stringify(p.primaryDrivers),
        negativeJson: JSON.stringify(p.negativeSensitivities),
        currentRegime: p.currentRegime,
        confidence: p.confidence,
        signal: p.signal ?? undefined,
      })),
    });
  } catch (e) {
    console.warn("[ops/durable] dna persist failed", e);
  }
}

export async function upsertIncident(input: {
  id: string;
  severity: string;
  domain: string;
  title: string;
  description: string;
  href?: string;
  runbook?: string;
  source: string;
}): Promise<void> {
  const now = new Date();
  try {
    await prisma.opsIncidentRecord.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        severity: input.severity,
        domain: input.domain,
        title: input.title,
        description: input.description,
        firstSeen: now,
        lastSeen: now,
        status: "open",
        source: input.source,
        href: input.href,
        runbook: input.runbook,
      },
      update: {
        severity: input.severity,
        title: input.title,
        description: input.description,
        lastSeen: now,
        href: input.href,
        runbook: input.runbook,
      },
    });
  } catch (e) {
    console.warn("[ops/durable] incident upsert failed", e);
  }
}

export async function updateIncidentStatus(input: {
  id: string;
  status: string;
  actorEmail: string;
}): Promise<void> {
  try {
    await prisma.opsIncidentRecord.update({
      where: { id: input.id },
      data: {
        status: input.status,
        acknowledgedBy: input.actorEmail,
        acknowledgedAt: new Date(),
        resolvedAt: input.status === "resolved" ? new Date() : undefined,
      },
    });
  } catch (e) {
    console.warn("[ops/durable] incident update failed", e);
  }
}

export async function loadIncidents(limit = 100) {
  try {
    return await prisma.opsIncidentRecord.findMany({
      orderBy: { lastSeen: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function loadLatestGraphEdges(limit = 50) {
  try {
    return await prisma.signalGraphEdge.findMany({
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function loadLatestDna(limit = 40) {
  try {
    return await prisma.marketDnaSnapshot.findMany({
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

/** Aggregate provider telemetry for Provider Health v2 (last N hours). */
export async function getProviderTelemetryStats(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  type Agg = {
    requests: number;
    ok: number;
    err: number;
    durations: number[];
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
  };
  const byProvider = new Map<string, Agg>();

  try {
    const rows = await prisma.opsTelemetryEvent.findMany({
      where: {
        observedAt: { gte: since },
        OR: [{ provider: { not: null } }, { eventName: { startsWith: "provider." } }],
      },
      select: {
        provider: true,
        status: true,
        durationMs: true,
        observedAt: true,
        eventName: true,
      },
      take: 5000,
      orderBy: { observedAt: "desc" },
    });

    for (const r of rows) {
      const key = (r.provider || "unknown").toUpperCase();
      const cur = byProvider.get(key) ?? {
        requests: 0,
        ok: 0,
        err: 0,
        durations: [],
        lastSuccessAt: null,
        lastFailureAt: null,
      };
      cur.requests += 1;
      const failed = r.status === "error" || r.status === "fail";
      if (failed) {
        cur.err += 1;
        if (!cur.lastFailureAt) cur.lastFailureAt = r.observedAt.toISOString();
      } else {
        cur.ok += 1;
        if (!cur.lastSuccessAt) cur.lastSuccessAt = r.observedAt.toISOString();
      }
      if (typeof r.durationMs === "number") cur.durations.push(r.durationMs);
      byProvider.set(key, cur);
    }
  } catch (e) {
    console.warn("[ops/durable] provider telemetry failed", e);
  }

  const out = new Map<
    string,
    {
      requestsToday: number;
      successPct: number | null;
      p95Ms: number | null;
      lastSuccessAt: string | null;
      lastFailureAt: string | null;
    }
  >();

  for (const [key, agg] of byProvider) {
    const sorted = [...agg.durations].sort((a, b) => a - b);
    const p95 =
      sorted.length > 0 ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!) : null;
    out.set(key, {
      requestsToday: agg.requests,
      successPct: agg.requests === 0 ? null : Math.round((agg.ok / agg.requests) * 1000) / 10,
      p95Ms: p95,
      lastSuccessAt: agg.lastSuccessAt,
      lastFailureAt: agg.lastFailureAt,
    });
  }
  return out;
}

export async function countSignalOutcomes() {
  try {
    const [total, pending, decided] = await Promise.all([
      prisma.signalOutcome.count(),
      prisma.signalOutcome.count({ where: { outcome: "PENDING" } }),
      prisma.signalOutcome.count({ where: { outcome: { not: "PENDING" } } }),
    ]);
    return { total, pending, decided };
  } catch {
    return { total: 0, pending: 0, decided: 0 };
  }
}
