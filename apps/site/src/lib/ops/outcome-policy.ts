/** Pure, versioned policy for market-outcome evaluation. No provider or database I/O. */
export const OUTCOME_EVALUATOR_VERSION = "MARKET_OUTCOME_V3";
export const OUTCOME_SEED_VERSIONS = [OUTCOME_EVALUATOR_VERSION, "MARKET_OUTCOME_V2"];
export const RETRYABLE_OUTCOME_PREFIX = "RETRYABLE_MARKET_DATA: ";
export const DAY_MS = 86_400_000;

export type ObservedDailyClose = {
  price: number;
  barAtMs: number;
  availableAtMs: number;
};

/**
 * Daily closes are conservative historical proxies, not execution prices. Wait
 * one full daily interval after the bar timestamp before considering its close
 * observable. Never select a future/incomplete bar, even when it is nearer.
 */
export function selectCompletedDailyClose(
  raw: unknown,
  cutoffMs: number,
  maxAgeMs = 4 * DAY_MS
): ObservedDailyClose | null {
  if (!Number.isFinite(cutoffMs) || cutoffMs <= 0 || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) return null;
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { s?: unknown; t?: unknown; c?: unknown };
  if (data.s !== "ok" || !Array.isArray(data.t) || !Array.isArray(data.c) || data.t.length !== data.c.length) return null;
  let best: ObservedDailyClose | null = null;
  for (let i = 0; i < data.t.length; i += 1) {
    const timestamp: unknown = data.t[i];
    const price: unknown = data.c[i];
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) continue;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
    const barAtMs = timestamp * 1000;
    const availableAtMs = barAtMs + DAY_MS;
    if (!Number.isFinite(availableAtMs) || availableAtMs > cutoffMs || cutoffMs - availableAtMs > maxAgeMs) continue;
    if (!best || availableAtMs > best.availableAtMs) best = { price, barAtMs, availableAtMs };
  }
  return best;
}

/** The forecast horizon starts at the frozen prediction, not later DB insertion. */
export function outcomeDueAt(recordedAtMs: number, horizonDays: number): number | null {
  if (!Number.isFinite(recordedAtMs) || recordedAtMs <= 0 || !Number.isInteger(horizonDays) || horizonDays <= 0) return null;
  const dueAt = recordedAtMs + horizonDays * DAY_MS;
  return Number.isSafeInteger(dueAt) && dueAt <= 8.64e15 ? dueAt : null;
}

export function classifyObservedReturn(score: number, entryPrice: number, outcomePrice: number): {
  outcome: "CONFIRMED" | "PARTIAL" | "REJECTED";
  realizedReturnPct: number;
} | null {
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(outcomePrice) || outcomePrice <= 0) return null;
  const realizedReturnPct = ((outcomePrice - entryPrice) / entryPrice) * 100;
  if (!Number.isFinite(realizedReturnPct)) return null;
  let outcome: "CONFIRMED" | "PARTIAL" | "REJECTED";
  if (score >= 55) outcome = realizedReturnPct >= 1 ? "CONFIRMED" : realizedReturnPct > -1 ? "PARTIAL" : "REJECTED";
  else if (score <= 45) outcome = realizedReturnPct <= -1 ? "CONFIRMED" : realizedReturnPct < 1 ? "PARTIAL" : "REJECTED";
  else outcome = Math.abs(realizedReturnPct) <= 1 ? "CONFIRMED" : Math.abs(realizedReturnPct) <= 3 ? "PARTIAL" : "REJECTED";
  return { outcome, realizedReturnPct };
}

const BUCKETS = [
  { bucket: "90–100", min: 90, max: 100 },
  { bucket: "80–89", min: 80, max: 89 },
  { bucket: "70–79", min: 70, max: 79 },
  { bucket: "60–69", min: 60, max: 69 },
  { bucket: "50–59", min: 50, max: 59 },
  { bucket: "<50", min: 0, max: 49 },
] as const;

export type CalibrationRow = { predictedConf: number | null; outcome: string };

export function summarizeCalibration(rows: readonly CalibrationRow[]) {
  const valid = rows.filter((row) =>
    typeof row.predictedConf === "number" && Number.isFinite(row.predictedConf) &&
    row.predictedConf >= 0 && row.predictedConf <= 100 &&
    ["CONFIRMED", "PARTIAL", "REJECTED"].includes(row.outcome)
  );
  const buckets = BUCKETS.map((b) => {
    // Floor only for bucket membership: decimal confidences must not fall in gaps.
    const samples = valid.filter((row) => {
      const conf = Math.floor(row.predictedConf!);
      return conf >= b.min && conf <= b.max;
    });
    const confirmed = samples.filter((row) => row.outcome === "CONFIRMED").length;
    const partial = samples.filter((row) => row.outcome === "PARTIAL").length;
    const observedReliability = samples.length ? Math.round(((confirmed + partial * 0.5) / samples.length) * 1000) / 10 : null;
    return {
      bucket: b.bucket,
      predictedMin: b.min,
      predictedMax: b.max,
      sampleSize: samples.length,
      observedReliability,
      warning: observedReliability != null && samples.length >= 30 && Math.abs(observedReliability - (b.min + b.max) / 2) > 15,
      calibrationReady: samples.length >= 30,
    };
  });
  return {
    buckets,
    evaluated: valid.length,
    excludedInvalid: rows.length - valid.length,
    // This is a sample-readiness flag, never a per-forecast success probability.
    forecastReady: valid.length >= 100 && buckets.some((b) => b.calibrationReady),
  };
}
