/** Market-grounded outcome evaluation. Motive Signal is not a forecast probability. */
import { prisma } from "@motivefx/database";
import {
  DAY_MS,
  OUTCOME_EVALUATOR_VERSION,
  OUTCOME_SEED_VERSIONS,
  RETRYABLE_OUTCOME_PREFIX,
  classifyObservedReturn,
  outcomeDueAt,
  selectCompletedDailyClose,
  summarizeCalibration,
  type ObservedDailyClose,
} from "./outcome-policy";

const RETRY_AFTER_MS = 60 * 60 * 1000;
const BATCH_BUDGET_MS = 12_000;
const LEGACY_MISSING_DATA_NOTE = "Observed historical market price unavailable or provider capability disabled; excluded from calibration";

function historicalDataEnabled(): boolean {
  return process.env.FINNHUB_HISTORICAL_ENABLED === "true" && Boolean(process.env.FINNHUB_API_KEY?.trim());
}

async function fetchObservedClose(symbol: string, atMs: number): Promise<ObservedDailyClose | null> {
  if (!historicalDataEnabled()) return null;
  const key = process.env.FINNHUB_API_KEY!.trim();
  const from = Math.floor((atMs - 5 * DAY_MS) / 1000);
  const to = Math.floor(atMs / 1000);
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(key)}`,
      { cache: "no-store", signal: AbortSignal.timeout(4_000) }
    );
    if (!res.ok) return null;
    return selectCompletedDailyClose(await res.json(), atMs);
  } catch {
    // Do not log the URL: it contains the provider credential.
    return null;
  }
}

export async function evaluatePendingOutcomes(limit = 50): Promise<{ evaluated: number; inconclusive: number }> {
  const now = Date.now();
  let evaluated = 0;
  let inconclusive = 0;
  // An unconfigured/disabled capability must not consume pending observations.
  if (!historicalDataEnabled()) return { evaluated, inconclusive };
  const take = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 50;
  try {
    const pending = await prisma.signalOutcome.findMany({
      where: {
        evaluatorVersion: { in: OUTCOME_SEED_VERSIONS },
        OR: [
          { outcome: "PENDING" },
          {
            outcome: "INCONCLUSIVE",
            evaluatedAt: { lte: new Date(now - RETRY_AFTER_MS) },
            OR: [
              { notes: { startsWith: RETRYABLE_OUTCOME_PREFIX } },
              { notes: LEGACY_MISSING_DATA_NOTE },
            ],
          },
        ],
      },
      include: { snapshot: true },
      take,
      orderBy: { createdAt: "asc" },
    });

    for (const row of pending) {
      if (Date.now() - now >= BATCH_BUDGET_MS) break;
      const entryAt = row.snapshot.recordedAt.getTime();
      const dueAt = outcomeDueAt(entryAt, row.horizonDays);
      if (dueAt != null && dueAt > now) continue;
      const score = row.predictedScore;
      // Compare-and-set prevents competing evaluators from overwriting a result.
      const where = { id: row.id, outcome: row.outcome, evaluatorVersion: row.evaluatorVersion };
      try {
        if (dueAt == null || score == null || !Number.isFinite(score) || score < 0 || score > 100) {
          const changed = await prisma.signalOutcome.updateMany({
            where,
            data: {
              outcome: "INCONCLUSIVE", evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
              evaluatedAt: new Date(), entryPrice: null, outcomePrice: null, realizedReturnPct: null,
              notes: "Invalid frozen prediction timestamp, horizon, or Motive Signal score; excluded from calibration",
            },
          });
          inconclusive += changed.count;
          continue;
        }
        const [entry, exit] = await Promise.all([
          fetchObservedClose(row.symbol, entryAt),
          fetchObservedClose(row.symbol, dueAt),
        ]);
        const result = entry && exit ? classifyObservedReturn(score, entry.price, exit.price) : null;
        if (!entry || !exit || !result) {
          const changed = await prisma.signalOutcome.updateMany({
            where,
            data: {
              outcome: "INCONCLUSIVE", evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
              evaluatedAt: new Date(), entryPrice: entry?.price ?? null,
              outcomePrice: exit?.price ?? null, realizedReturnPct: null,
              notes: `${RETRYABLE_OUTCOME_PREFIX}Completed as-of daily closes unavailable; excluded from calibration and eligible for retry after one hour`,
            },
          });
          inconclusive += changed.count;
          continue;
        }
        const changed = await prisma.signalOutcome.updateMany({
          where,
          data: {
            ...result, evaluatorVersion: OUTCOME_EVALUATOR_VERSION, evaluatedAt: new Date(),
            entryPrice: entry.price, outcomePrice: exit.price,
            notes: `Completed daily-close proxy (not execution prices): ${entry.price.toFixed(4)} → ${exit.price.toFixed(4)} (${result.realizedReturnPct.toFixed(2)}%); entry bar ${new Date(entry.barAtMs).toISOString()}, outcome bar ${new Date(exit.barAtMs).toISOString()}`,
          },
        });
        evaluated += changed.count;
      } catch {
        // One unavailable/deleted row must not abort all remaining observations.
        console.warn("[ops/outcomes] row evaluation failed; retained for retry");
      }
    }
  } catch {
    console.warn("[ops/outcomes] evaluation store unavailable");
  }
  return { evaluated, inconclusive };
}

export async function buildCalibrationFromOutcomes() {
  await evaluatePendingOutcomes(80);
  const providerEnabled = historicalDataEnabled();
  try {
    const [rows, pendingCount, inconclusiveCount] = await Promise.all([
      prisma.signalOutcome.findMany({
        // V2 completed rows used different timestamp semantics. Keep them auditable,
        // but never mix their results into the corrected evaluator's calibration.
        where: { evaluatorVersion: OUTCOME_EVALUATOR_VERSION, outcome: { in: ["CONFIRMED", "PARTIAL", "REJECTED"] } },
        select: { predictedConf: true, outcome: true },
        take: 2000,
        orderBy: { evaluatedAt: "desc" },
      }),
      prisma.signalOutcome.count({ where: { outcome: "PENDING", evaluatorVersion: { in: OUTCOME_SEED_VERSIONS } } }),
      prisma.signalOutcome.count({ where: { outcome: "INCONCLUSIVE", evaluatorVersion: { in: OUTCOME_SEED_VERSIONS } } }),
    ]);
    const summary = summarizeCalibration(rows);
    const note = summary.evaluated === 0
      ? "No V3 market-grounded evaluated outcomes yet. Forecast probability remains unavailable."
      : `Calibration uses ${summary.evaluated} V3 market-grounded outcome(s); ${pendingCount} pending; ${inconclusiveCount} inconclusive; ${summary.excludedInvalid} invalid confidence sample(s) excluded.`;
    return {
      ...summary,
      note: providerEnabled ? note : `${note} Historical provider capability is disabled or unconfigured; pending outcomes are preserved.`,
      evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
      historicalDataEnabled: providerEnabled,
      pending: pendingCount,
      inconclusive: inconclusiveCount,
    };
  } catch {
    console.warn("[ops/outcomes] calibration store unavailable");
    return {
      ...summarizeCalibration([]),
      note: "Outcome store unavailable.",
      evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
      historicalDataEnabled: providerEnabled,
      pending: 0,
      inconclusive: 0,
    };
  }
}
