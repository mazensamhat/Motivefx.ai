/**
 * Signal outcome evaluation + calibration from durable, market-grounded outcomes.
 * Motive Signal is evidence alignment, not a calibrated probability.
 */
import { prisma } from "@motivefx/database";

const EVALUATOR_VERSION = "MARKET_OUTCOME_V2";
const BUCKETS = [
  { bucket: "90–100", min: 90, max: 100 },
  { bucket: "80–89", min: 80, max: 89 },
  { bucket: "70–79", min: 70, max: 79 },
  { bucket: "60–69", min: 60, max: 69 },
  { bucket: "50–59", min: 50, max: 59 },
  { bucket: "<50", min: 0, max: 49 },
] as const;

type CandleResponse = { s?: string; t?: number[]; c?: number[] };

async function fetchObservedClose(symbol: string, atMs: number): Promise<number | null> {
  // Historical candles are a provider capability, not an assumption. Finnhub documents
  // /stock/candle as Premium; disable unless the deployment explicitly enables it.
  if (process.env.FINNHUB_HISTORICAL_ENABLED !== "true") return null;

  const key = process.env.FINNHUB_API_KEY?.trim();
  if (!key) return null;
  const from = Math.floor((atMs - 4 * 86400000) / 1000);
  const to = Math.floor((atMs + 4 * 86400000) / 1000);
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(key)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as CandleResponse;
    if (data.s !== "ok" || !data.t?.length || !data.c?.length) return null;
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < data.t.length; i += 1) {
      const distance = Math.abs(data.t[i]! * 1000 - atMs);
      if (distance < bestDistance && Number.isFinite(data.c[i])) {
        best = i;
        bestDistance = distance;
      }
    }
    return best >= 0 ? Number(data.c[best]) : null;
  } catch {
    return null;
  }
}

function classifyOutcome(score: number, returnPct: number): "CONFIRMED" | "PARTIAL" | "REJECTED" {
  const neutralBand = 1;
  if (score >= 55) {
    if (returnPct >= 1) return "CONFIRMED";
    if (returnPct > -1) return "PARTIAL";
    return "REJECTED";
  }
  if (score <= 45) {
    if (returnPct <= -1) return "CONFIRMED";
    if (returnPct < 1) return "PARTIAL";
    return "REJECTED";
  }
  if (Math.abs(returnPct) <= neutralBand) return "CONFIRMED";
  if (Math.abs(returnPct) <= 3) return "PARTIAL";
  return "REJECTED";
}

export async function evaluatePendingOutcomes(limit = 50): Promise<{ evaluated: number; inconclusive: number }> {
  const now = Date.now();
  let evaluated = 0;
  let inconclusive = 0;
  try {
    const pending = await prisma.signalOutcome.findMany({
      where: { outcome: "PENDING", evaluatorVersion: EVALUATOR_VERSION },
      include: { snapshot: true },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    for (const row of pending) {
      const dueAt = row.createdAt.getTime() + row.horizonDays * 86400000;
      if (dueAt > now) continue;
      const score = row.predictedScore;
      if (score == null) {
        await prisma.signalOutcome.update({
          where: { id: row.id },
          data: { outcome: "INCONCLUSIVE", evaluatedAt: new Date(), notes: "Missing predicted Motive Signal score" },
        });
        inconclusive += 1;
        continue;
      }

      const entryAt = row.snapshot.recordedAt.getTime();
      const [entryPrice, outcomePrice] = await Promise.all([
        fetchObservedClose(row.symbol, entryAt),
        fetchObservedClose(row.symbol, dueAt),
      ]);
      if (!(entryPrice && entryPrice > 0 && outcomePrice && outcomePrice > 0)) {
        await prisma.signalOutcome.update({
          where: { id: row.id },
          data: {
            outcome: "INCONCLUSIVE",
            evaluatedAt: new Date(),
            entryPrice: entryPrice ?? undefined,
            outcomePrice: outcomePrice ?? undefined,
            notes: "Observed historical market price unavailable or provider capability disabled; excluded from calibration",
          },
        });
        inconclusive += 1;
        continue;
      }

      const realizedReturnPct = ((outcomePrice - entryPrice) / entryPrice) * 100;
      const outcome = classifyOutcome(score, realizedReturnPct);
      await prisma.signalOutcome.update({
        where: { id: row.id },
        data: {
          outcome,
          evaluatedAt: new Date(),
          entryPrice,
          outcomePrice,
          realizedReturnPct,
          notes: `Observed ${row.symbol}: ${entryPrice.toFixed(4)} → ${outcomePrice.toFixed(4)} (${realizedReturnPct.toFixed(2)}%)`,
        },
      });
      evaluated += 1;
    }
    return { evaluated, inconclusive };
  } catch (e) {
    console.warn("[ops/outcomes] evaluate failed", e);
    return { evaluated, inconclusive };
  }
}

export async function buildCalibrationFromOutcomes() {
  await evaluatePendingOutcomes(80);
  try {
    const rows = await prisma.signalOutcome.findMany({
      where: {
        evaluatorVersion: EVALUATOR_VERSION,
        outcome: { in: ["CONFIRMED", "PARTIAL", "REJECTED"] },
      },
      select: { predictedConf: true, outcome: true },
      take: 2000,
      orderBy: { evaluatedAt: "desc" },
    });
    const pendingCount = await prisma.signalOutcome.count({
      where: { outcome: "PENDING", evaluatorVersion: EVALUATOR_VERSION },
    });
    const inconclusiveCount = await prisma.signalOutcome.count({
      where: { outcome: "INCONCLUSIVE", evaluatorVersion: EVALUATOR_VERSION },
    });

    const buckets = BUCKETS.map((b) => {
      const inBucket = rows.filter((r) => {
        const conf = r.predictedConf ?? 0;
        return conf >= b.min && conf <= b.max;
      });
      const confirmed = inBucket.filter((r) => r.outcome === "CONFIRMED").length;
      const partial = inBucket.filter((r) => r.outcome === "PARTIAL").length;
      const observed = inBucket.length === 0 ? null : Math.round(((confirmed + partial * 0.5) / inBucket.length) * 1000) / 10;
      const mid = (b.min + b.max) / 2;
      const warning = observed != null && inBucket.length >= 30 && Math.abs(observed - mid) > 15;
      return {
        bucket: b.bucket,
        predictedMin: b.min,
        predictedMax: b.max,
        sampleSize: inBucket.length,
        observedReliability: observed,
        warning,
        calibrationReady: inBucket.length >= 30,
      };
    });

    return {
      note: rows.length === 0
        ? "No market-grounded evaluated outcomes yet. Forecast probability remains unavailable."
        : `Calibration uses ${rows.length} market-grounded outcome(s); ${pendingCount} pending; ${inconclusiveCount} excluded.`,
      evaluatorVersion: EVALUATOR_VERSION,
      buckets,
      evaluated: rows.length,
      pending: pendingCount,
      inconclusive: inconclusiveCount,
      forecastReady: rows.length >= 100 && buckets.some((b) => b.calibrationReady),
    };
  } catch (e) {
    console.warn("[ops/outcomes] calibration failed", e);
    return {
      note: "Outcome store unavailable.",
      evaluatorVersion: EVALUATOR_VERSION,
      buckets: BUCKETS.map((b) => ({
        bucket: b.bucket, predictedMin: b.min, predictedMax: b.max, sampleSize: 0,
        observedReliability: null as number | null, warning: false, calibrationReady: false,
      })),
      evaluated: 0, pending: 0, inconclusive: 0, forecastReady: false,
    };
  }
}
