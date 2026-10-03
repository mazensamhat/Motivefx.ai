/** Cross-market, horizon-aware outcome evaluation. Motive Signal is evidence strength, never an outcome probability. */
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

export const OUTCOME_EVALUATOR_VERSION = "MARKET_OUTCOME_V4";
const SEED_VERSIONS = [OUTCOME_EVALUATOR_VERSION, "MARKET_OUTCOME_V3", "MARKET_OUTCOME_V2", "LEGACY_SIGNAL_V1"];
const RETRY_AFTER_MS = 60 * 60 * 1000;
const BATCH_BUDGET_MS = 35_000;
const LEGACY_MISSING_DATA_NOTE = "Observed historical market price unavailable or provider capability disabled; excluded from calibration";
const PRICE_MARKETS = new Set(["stocks", "penny", "crypto"]);
const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", USDT: "tether", USDC: "usd-coin", SOL: "solana",
  XRP: "ripple", DOGE: "dogecoin", BNB: "binancecoin", ADA: "cardano", AVAX: "avalanche-2",
};
const priceCache = new Map<string, Promise<ObservedDailyClose | null>>();

function finnhubHistoricalEnabled(): boolean {
  return process.env.FINNHUB_HISTORICAL_ENABLED === "true" && Boolean(process.env.FINNHUB_API_KEY?.trim());
}

function safeEvidence(raw: string): Array<{ id?: string; market?: string; sourceReference?: string }> {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value as Array<{ id?: string; market?: string; sourceReference?: string }> : [];
  } catch { return []; }
}

function inferredMarket(snapshot: { evidenceJson: string; signalEvidenceJson: string; symbol: string }): string {
  const evidence = safeEvidence(snapshot.signalEvidenceJson).length
    ? safeEvidence(snapshot.signalEvidenceJson)
    : safeEvidence(snapshot.evidenceJson);
  const market = evidence.find((e) => typeof e.market === "string")?.market;
  if (market && market !== "stocks") return market;
  const id = evidence.find((e) => typeof e.id === "string")?.id ?? "";
  if (id.startsWith("opp-crypto-")) return "crypto";
  if (id.startsWith("opp-penny-")) return "penny";
  if (id.startsWith("opp-betting-")) return "sports";
  if (id.startsWith("opp-pred-")) return "predictions";
  if (id.startsWith("opp-trades-") || id.startsWith("opp-stock-")) return "stocks";
  return market ?? "stocks";
}

function coinId(symbol: string): string | null {
  return COIN_IDS[symbol.trim().toUpperCase()] ?? null;
}

function coingeckoDate(atMs: number): string {
  const d = new Date(atMs);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

async function fetchCoinGeckoHistorical(symbol: string, atMs: number): Promise<ObservedDailyClose | null> {
  const id = coinId(symbol);
  if (!id) return null;
  const key = `cg:${id}:${coingeckoDate(atMs)}`;
  const hit = priceCache.get(key);
  if (hit) return hit;
  const work = (async () => {
    try {
      const url = new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/history`);
      url.searchParams.set("date", coingeckoDate(atMs));
      url.searchParams.set("localization", "false");
      const res = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(5_000) });
      if (!res.ok) return null;
      const raw = await res.json() as { market_data?: { current_price?: { usd?: unknown } } };
      const price = Number(raw.market_data?.current_price?.usd);
      if (!Number.isFinite(price) || price <= 0) return null;
      const barAtMs = Date.UTC(new Date(atMs).getUTCFullYear(), new Date(atMs).getUTCMonth(), new Date(atMs).getUTCDate());
      return { price, barAtMs, availableAtMs: barAtMs + DAY_MS };
    } catch { return null; }
  })();
  priceCache.set(key, work);
  return work;
}

async function fetchFinnhubClose(symbol: string, atMs: number): Promise<ObservedDailyClose | null> {
  if (!finnhubHistoricalEnabled()) return null;
  const key = process.env.FINNHUB_API_KEY!.trim();
  const cacheKey = `fh:${symbol.toUpperCase()}:${new Date(atMs).toISOString().slice(0, 10)}`;
  const hit = priceCache.get(cacheKey);
  if (hit) return hit;
  const work = (async () => {
    const from = Math.floor((atMs - 5 * DAY_MS) / 1000);
    const to = Math.floor(atMs / 1000);
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(key)}`,
        { cache: "no-store", signal: AbortSignal.timeout(4_000) }
      );
      if (!res.ok) return null;
      return selectCompletedDailyClose(await res.json(), atMs);
    } catch { return null; }
  })();
  priceCache.set(cacheKey, work);
  return work;
}

async function fetchObservedClose(market: string, symbol: string, atMs: number) {
  if (market === "crypto") return fetchCoinGeckoHistorical(symbol, atMs);
  if (market === "stocks" || market === "penny") return fetchFinnhubClose(symbol, atMs);
  return null;
}

export async function evaluatePendingOutcomes(limit = 2000): Promise<{
  evaluated: number;
  inconclusive: number;
  pendingVisited: number;
  providerBlocked: number;
}> {
  const started = Date.now();
  let evaluated = 0, inconclusive = 0, providerBlocked = 0;
  const take = Number.isFinite(limit) ? Math.min(2500, Math.max(1, Math.floor(limit))) : 2000;
  const rows = await prisma.signalOutcome.findMany({
    where: {
      evaluatorVersion: { in: OUTCOME_SEED_VERSIONS },
      OR: [
        { outcome: "PENDING" },
        {
          outcome: "INCONCLUSIVE",
          evaluatedAt: { lte: new Date(started - RETRY_AFTER_MS) },
          notes: { startsWith: RETRYABLE_OUTCOME_PREFIX },
        },
      ],
    },
    include: { snapshot: true },
    take,
    orderBy: { createdAt: "asc" },
  });

  const unsupportedDue: string[] = [];
  for (const row of rows) {
    if (Date.now() - started >= BATCH_BUDGET_MS) break;
    const entryAt = row.snapshot.recordedAt.getTime();
    const dueAt = outcomeDueAt(entryAt, row.horizonDays);
    if (dueAt != null && dueAt > started) continue;
    const market = inferredMarket(row.snapshot);
    const score = row.predictedScore;
    if (dueAt == null || score == null || !Number.isFinite(score) || score < 0 || score > 100) {
      unsupportedDue.push(row.id); continue;
    }
    if (!PRICE_MARKETS.has(market)) {
      unsupportedDue.push(row.id); continue;
    }
    if ((market === "stocks" || market === "penny") && !finnhubHistoricalEnabled()) {
      providerBlocked += 1; continue;
    }
    const where = { id: row.id, outcome: row.outcome, evaluatorVersion: row.evaluatorVersion };
    try {
      const [entry, exit] = await Promise.all([
        fetchObservedClose(market, row.symbol, entryAt),
        fetchObservedClose(market, row.symbol, dueAt),
      ]);
      const result = entry && exit ? classifyObservedReturn(score, entry.price, exit.price) : null;
      if (!entry || !exit || !result) {
        const changed = await prisma.signalOutcome.updateMany({
          where,
          data: {
            outcome: "INCONCLUSIVE", evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
            evaluatedAt: new Date(), entryPrice: entry?.price ?? null, outcomePrice: exit?.price ?? null,
            realizedReturnPct: null,
            notes: `${RETRYABLE_OUTCOME_PREFIX}${market} historical price unavailable for completed horizon; excluded and eligible for retry.`,
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
          notes: `${market} historical close proxy (not execution prices): ${entry.price.toFixed(6)} → ${exit.price.toFixed(6)} (${result.realizedReturnPct.toFixed(2)}%).`,
        },
      });
      evaluated += changed.count;
    } catch {
      console.warn("[ops/outcomes] row evaluation failed; retained for retry");
    }
  }

  if (unsupportedDue.length) {
    const changed = await prisma.signalOutcome.updateMany({
      where: { id: { in: unsupportedDue }, outcome: { in: ["PENDING", "INCONCLUSIVE"] } },
      data: {
        outcome: "INCONCLUSIVE", evaluatorVersion: OUTCOME_EVALUATOR_VERSION, evaluatedAt: new Date(),
        entryPrice: null, outcomePrice: null, realizedReturnPct: null,
        notes: "Generic evidence-strength signal did not encode a price-direction target or has invalid frozen inputs; excluded from outcome scoring.",
      },
    });
    inconclusive += changed.count;
  }
  return { evaluated, inconclusive, pendingVisited: rows.length, providerBlocked };
}

export async function buildCalibrationFromOutcomes() {
  const providerEnabled = finnhubHistoricalEnabled() || true; // CoinGecko crypto history is public.
  try {
    const [rows, pendingCount, inconclusiveCount] = await Promise.all([
      prisma.signalOutcome.findMany({
        where: { evaluatorVersion: OUTCOME_EVALUATOR_VERSION, outcome: { in: ["CONFIRMED", "PARTIAL", "REJECTED"] } },
        select: { predictedConf: true, outcome: true, symbol: true },
        take: 5000,
        orderBy: { evaluatedAt: "desc" },
      }),
      prisma.signalOutcome.count({ where: { outcome: "PENDING" } }),
      prisma.signalOutcome.count({ where: { outcome: "INCONCLUSIVE" } }),
    ]);
    const summary = summarizeCalibration(rows);
    const distinctSymbols = new Set(rows.map((r) => r.symbol.toUpperCase())).size;
    const note = summary.evaluated === 0
      ? "No V4 market-grounded evaluated outcomes yet. Forecast probability remains unavailable."
      : `Track Record has ${summary.evaluated} V4 price-grounded observations across ${distinctSymbols} symbol(s); ${pendingCount} pending; ${inconclusiveCount} excluded/inconclusive.`;
    return {
      ...summary, note, evaluatorVersion: OUTCOME_EVALUATOR_VERSION, historicalDataEnabled: providerEnabled,
      pending: pendingCount, inconclusive: inconclusiveCount, distinctSymbols,
    };
  } catch {
    return {
      ...summarizeCalibration([]), note: "Outcome store unavailable.", evaluatorVersion: OUTCOME_EVALUATOR_VERSION,
      historicalDataEnabled: providerEnabled, pending: 0, inconclusive: 0, distinctSymbols: 0,
    };
  }
}
