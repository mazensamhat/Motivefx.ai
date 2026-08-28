/**
 * Signal outcome evaluation + confidence calibration from durable SignalOutcome rows.
 */

import { prisma } from "@motivefx/database";

const BUCKETS = [
  { bucket: "90–100", min: 90, max: 100 },
  { bucket: "80–89", min: 80, max: 89 },
  { bucket: "70–79", min: 70, max: 79 },
  { bucket: "60–69", min: 60, max: 69 },
  { bucket: "50–59", min: 50, max: 59 },
  { bucket: "<50", min: 0, max: 49 },
] as const;

/**
 * Evaluate PENDING outcomes past their horizon using subsequent snapshots
 * for the same symbol (direction agreement = CONFIRMED / PARTIAL / REJECTED).
 */
export async function evaluatePendingOutcomes(limit = 50): Promise<{ evaluated: number }> {
  const now = Date.now();
  try {
    const pending = await prisma.signalOutcome.findMany({
      where: { outcome: "PENDING" },
      include: { snapshot: true },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    let evaluated = 0;
    for (const row of pending) {
      const dueAt = row.createdAt.getTime() + row.horizonDays * 86400000;
      if (dueAt > now) continue;

      const later = await prisma.signalSnapshot.findFirst({
        where: {
          symbol: row.symbol,
          recordedAt: { gt: row.snapshot.recordedAt },
        },
        orderBy: { recordedAt: "desc" },
      });

      let outcome: string = "INCONCLUSIVE";
      let notes = "No later snapshot available for direction check";

      if (later?.motiveSignal != null && row.predictedScore != null) {
        const predictedBull = row.predictedScore >= 55;
        const laterBull = later.motiveSignal >= 55;
        const delta = Math.abs(later.motiveSignal - row.predictedScore);
        if (predictedBull === laterBull && delta <= 25) {
          outcome = "CONFIRMED";
          notes = `Later signal ${later.motiveSignal} agreed with predicted ${row.predictedScore}`;
        } else if (predictedBull === laterBull) {
          outcome = "PARTIAL";
          notes = `Direction agreed; magnitude drifted (Δ ${delta.toFixed(0)})`;
        } else {
          outcome = "REJECTED";
          notes = `Later signal ${later.motiveSignal} opposed predicted ${row.predictedScore}`;
        }
      }

      await prisma.signalOutcome.update({
        where: { id: row.id },
        data: { outcome, evaluatedAt: new Date(), notes },
      });
      evaluated += 1;
    }
    return { evaluated };
  } catch (e) {
    console.warn("[ops/outcomes] evaluate failed", e);
    return { evaluated: 0 };
  }
}

export async function buildCalibrationFromOutcomes() {
  await evaluatePendingOutcomes(80);

  try {
    const rows = await prisma.signalOutcome.findMany({
      where: { outcome: { not: "PENDING" } },
      select: {
        predictedConf: true,
        outcome: true,
      },
      take: 2000,
    });

    const pendingCount = await prisma.signalOutcome.count({ where: { outcome: "PENDING" } });

    const buckets = BUCKETS.map((b) => {
      const inBucket = rows.filter((r) => {
        const conf = r.predictedConf ?? 0;
        return conf >= b.min && conf <= b.max;
      });
      const confirmed = inBucket.filter(
        (r) => r.outcome === "CONFIRMED" || r.outcome === "PARTIAL"
      ).length;
      const observed =
        inBucket.length === 0 ? null : Math.round((confirmed / inBucket.length) * 1000) / 10;
      const mid = (b.min + b.max) / 2;
      const warning =
        observed != null && inBucket.length >= 5 && Math.abs(observed - mid) > 20;
      return {
        bucket: b.bucket,
        predictedMin: b.min,
        predictedMax: b.max,
        sampleSize: inBucket.length,
        observedReliability: observed,
        warning,
      };
    });

    return {
      note:
        rows.length === 0
          ? "No evaluated outcomes yet — PENDING rows evaluate after horizon using later snapshots."
          : `Calibration from ${rows.length} evaluated SignalOutcome row(s); ${pendingCount} still PENDING.`,
      buckets,
      evaluated: rows.length,
      pending: pendingCount,
    };
  } catch (e) {
    console.warn("[ops/outcomes] calibration failed", e);
    return {
      note: "Outcome store unavailable — falling back unavailable.",
      buckets: BUCKETS.map((b) => ({
        bucket: b.bucket,
        predictedMin: b.min,
        predictedMax: b.max,
        sampleSize: 0,
        observedReliability: null as number | null,
        warning: false,
      })),
      evaluated: 0,
      pending: 0,
    };
  }
}
