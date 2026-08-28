/**
 * Historical replay — look-ahead safe: only SignalSnapshots with recordedAt <= asOfTimestamp.
 */

import { prisma } from "@motivefx/database";
import { classifyMotiveStance } from "@/lib/terminal/market-truth/signal-confluence";
import { recordAudit } from "./audit";

export const REPLAY_PERIODS = [
  { key: "covid", label: "COVID crash", asOf: "2020-03-23T00:00:00.000Z" },
  { key: "inflation-2022", label: "2022 inflation shock", asOf: "2022-06-15T00:00:00.000Z" },
  { key: "banking-2023", label: "Regional banking crisis", asOf: "2023-03-15T00:00:00.000Z" },
  { key: "oil-shock", label: "Oil shock", asOf: "2022-03-08T00:00:00.000Z" },
  { key: "fed-pivot", label: "Major Fed pivot", asOf: "2023-11-01T00:00:00.000Z" },
  { key: "ai-boom", label: "AI boom", asOf: "2023-05-01T00:00:00.000Z" },
  { key: "crypto-selloff", label: "Crypto selloff", asOf: "2022-11-10T00:00:00.000Z" },
] as const;

export async function listReplayJobs(limit = 20) {
  try {
    return await prisma.opsReplayJob.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function enqueueReplayJob(input: {
  periodKey: string;
  actorId: string;
  actorEmail: string;
}): Promise<{ id: string; status: string } | { error: string }> {
  const period = REPLAY_PERIODS.find((p) => p.key === input.periodKey);
  if (!period) return { error: "Unknown periodKey" };

  try {
    const job = await prisma.opsReplayJob.create({
      data: {
        periodKey: period.key,
        periodLabel: period.label,
        status: "queued",
        asOfTimestamp: new Date(period.asOf),
        createdBy: input.actorEmail,
      },
    });

    recordAudit({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      action: "ops.replay.enqueued",
      targetType: "replay_job",
      targetId: job.id,
      result: "success",
      after: { periodKey: period.key, asOf: period.asOf },
    });

    // Fire-and-forget execution
    void runReplayJob(job.id).catch((e) => console.warn("[ops/replay] run failed", e));

    return { id: job.id, status: job.status };
  } catch (e) {
    console.warn("[ops/replay] enqueue failed", e);
    return { error: "Could not enqueue replay" };
  }
}

export async function runReplayJob(jobId: string): Promise<void> {
  const job = await prisma.opsReplayJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "running" || job.status === "completed") return;

  await prisma.opsReplayJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const asOf = job.asOfTimestamp;
    const snapshots = await prisma.signalSnapshot.findMany({
      where: { recordedAt: { lte: asOf } },
      orderBy: { recordedAt: "desc" },
      take: 500,
    });

    // Look-ahead check: no snapshot after asOf may influence results (already filtered)
    const bySymbol = new Map<string, (typeof snapshots)[0]>();
    for (const s of snapshots) {
      if (!bySymbol.has(s.symbol)) bySymbol.set(s.symbol, s);
    }

    const evaluated = [...bySymbol.values()];
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    for (const s of evaluated) {
      const stance = classifyMotiveStance(s.motiveSignal ?? 50);
      if (stance.includes("Constructive")) bullish += 1;
      else if (stance.includes("Defensive")) bearish += 1;
      else neutral += 1;
    }

    // Direction accuracy proxy: compare as-of snapshot vs next available after asOf (when present)
    let checked = 0;
    let agreed = 0;
    for (const s of evaluated.slice(0, 40)) {
      const next = await prisma.signalSnapshot.findFirst({
        where: { symbol: s.symbol, recordedAt: { gt: asOf } },
        orderBy: { recordedAt: "asc" },
      });
      if (!next?.motiveSignal || s.motiveSignal == null) continue;
      checked += 1;
      const predBull = s.motiveSignal >= 55;
      const nextBull = next.motiveSignal >= 55;
      if (predBull === nextBull) agreed += 1;
    }

    const directionAccuracy =
      checked === 0 ? null : Math.round((agreed / checked) * 1000) / 10;

    const result = {
      lookAheadProtected: true,
      asOf: asOf.toISOString(),
      symbols: evaluated.length,
      stanceMix: { bullish, bearish, neutral },
      directionChecks: checked,
      directionAgreed: agreed,
      sample: evaluated.slice(0, 12).map((s) => ({
        symbol: s.symbol,
        motiveSignal: s.motiveSignal,
        recordedAt: s.recordedAt.toISOString(),
        stance: classifyMotiveStance(s.motiveSignal ?? 50),
      })),
    };

    await prisma.opsReplayJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        signalsEvaluated: evaluated.length,
        directionAccuracy: directionAccuracy ?? undefined,
        resultJson: JSON.stringify(result),
      },
    });
  } catch (e) {
    await prisma.opsReplayJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: e instanceof Error ? e.message : "replay_failed",
      },
    });
  }
}
