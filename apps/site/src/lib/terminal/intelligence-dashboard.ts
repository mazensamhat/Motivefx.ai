import { prisma } from "@motivefx/database";
import { listBets } from "@/lib/terminal/bets";
import { listPredictions } from "@/lib/terminal/predictions";
import { listWatchlist } from "@/lib/terminal/watchlist";

type Holding = { symbol?: string; shares?: number; amount?: number; avg_cost?: number };
type MarketKey = "stocks" | "penny" | "crypto" | "sports" | "predictions" | "unknown";

type SignalRow = {
  symbol: string;
  motiveSignal: number | null;
  confidence: number | null;
  stance: string | null;
  evidenceJson: string;
  signalEvidenceJson: string;
  evidenceCount: number;
  signalEvidenceCount: number;
  engineVersion: string;
  recordedAt: Date;
};

function parseArray(raw: string): Array<Record<string, unknown>> {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value)
      ? value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v))
      : [];
  } catch {
    return [];
  }
}

function parseHoldings(raw: string): Holding[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value as Holding[] : [];
  } catch {
    return [];
  }
}

export function inferSignalMarket(row: Pick<SignalRow, "symbol" | "evidenceJson">): MarketKey {
  const evidence = parseArray(row.evidenceJson);
  for (const ev of evidence) {
    const market = String(ev.market ?? "").toLowerCase();
    if (market === "stocks" || market === "penny" || market === "crypto" || market === "sports" || market === "predictions") return market;
    const id = String(ev.id ?? "").toLowerCase();
    if (id.startsWith("opp-crypto-")) return "crypto";
    if (id.startsWith("opp-penny-")) return "penny";
    if (id.startsWith("opp-betting-")) return "sports";
    if (id.startsWith("opp-pred-")) return "predictions";
    if (id.startsWith("opp-stock-") || id.startsWith("opp-trades-")) return "stocks";
  }
  return /^[A-Z][A-Z0-9.\-]{0,12}$/.test(row.symbol) ? "stocks" : "unknown";
}

function groupSignals(rows: SignalRow[]) {
  const grouped = new Map<string, SignalRow[]>();
  for (const row of rows) {
    const key = row.symbol.toUpperCase();
    const list = grouped.get(key) ?? [];
    if (list.length < 12) list.push(row);
    grouped.set(key, list);
  }
  return grouped;
}

function signalChange(rows: SignalRow[]) {
  const current = rows[0]?.motiveSignal;
  const previous = rows[1]?.motiveSignal;
  return current != null && previous != null ? Math.round((current - previous) * 10) / 10 : null;
}

function safeSignal(value: number | null) {
  return value != null && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value * 10) / 10 : null;
}

function evidenceSummary(row: SignalRow | undefined) {
  if (!row) return [] as string[];
  const evidence = parseArray(row.signalEvidenceJson || row.evidenceJson);
  return evidence.slice(0, 4).map((ev) => {
    const provider = String(ev.provider ?? "source");
    const group = String(ev.group ?? ev.market ?? "evidence").replace(/_/g, " ").toLowerCase();
    return `${provider}: ${group}`;
  });
}

export async function buildPortfolioIntelligence(userId: string) {
  const [portfolios, bets, predictions, watchlist] = await Promise.all([
    prisma.userPortfolio.findMany({ where: { userId }, orderBy: { module: "asc" } }),
    listBets(userId),
    listPredictions(userId),
    listWatchlist(userId),
  ]);

  const assets = portfolios.flatMap((row) =>
    parseHoldings(row.holdingsJson)
      .filter((h) => typeof h.symbol === "string" && h.symbol.trim())
      .map((h) => ({
        module: row.module,
        symbol: String(h.symbol).trim().toUpperCase(),
        quantity: row.module === "crypto" ? h.amount ?? null : h.shares ?? null,
        avgCost: h.avg_cost ?? null,
      }))
  );
  const symbols = [...new Set(assets.map((a) => a.symbol))];
  const signalRows = symbols.length
    ? await prisma.signalSnapshot.findMany({
        where: { symbol: { in: symbols } },
        orderBy: { recordedAt: "desc" },
        take: Math.min(1200, Math.max(120, symbols.length * 12)),
        select: {
          symbol: true, motiveSignal: true, confidence: true, stance: true,
          evidenceJson: true, signalEvidenceJson: true, evidenceCount: true,
          signalEvidenceCount: true, engineVersion: true, recordedAt: true,
        },
      })
    : [];
  const grouped = groupSignals(signalRows);
  const enrichedAssets = assets.map((asset) => {
    const rows = grouped.get(asset.symbol) ?? [];
    const latest = rows[0];
    return {
      ...asset,
      motiveSignal: safeSignal(latest?.motiveSignal ?? null),
      evidenceConfidence: safeSignal(latest?.confidence ?? null),
      stance: latest?.stance ?? null,
      signalChange: signalChange(rows),
      lastSignalAt: latest?.recordedAt.toISOString() ?? null,
      evidence: evidenceSummary(latest),
    };
  });

  const dnaRows = symbols.length
    ? await prisma.marketDnaSnapshot.findMany({
        where: { asset: { in: symbols } },
        orderBy: { recordedAt: "desc" },
        take: Math.min(300, Math.max(50, symbols.length * 4)),
      })
    : [];
  const seenDna = new Set<string>();
  const driverCounts = new Map<string, number>();
  for (const row of dnaRows) {
    const asset = row.asset.toUpperCase();
    if (seenDna.has(asset)) continue;
    seenDna.add(asset);
    try {
      const drivers = JSON.parse(row.primaryDriversJson) as unknown;
      if (Array.isArray(drivers)) {
        for (const raw of drivers.slice(0, 5)) {
          const label = typeof raw === "string" ? raw : raw && typeof raw === "object" ? String((raw as Record<string, unknown>).label ?? (raw as Record<string, unknown>).name ?? "") : "";
          if (!label) continue;
          driverCounts.set(label, (driverCounts.get(label) ?? 0) + 1);
        }
      }
    } catch {
      /* ignore malformed historical rows */
    }
  }

  const moduleCounts: Record<string, number> = {};
  for (const asset of enrichedAssets) moduleCounts[asset.module] = (moduleCounts[asset.module] ?? 0) + 1;
  const openBets = bets.filter((b) => b.status === "open" && !b.is_simulation);
  const openPredictions = predictions.filter((p) => p.status === "open" && !p.is_simulation);
  moduleCounts.betting = openBets.length;
  moduleCounts.predictions = openPredictions.length;
  const totalTracked = Object.values(moduleCounts).reduce((sum, n) => sum + n, 0);
  const moduleMix = Object.entries(moduleCounts)
    .map(([module, count]) => ({ module, count, sharePct: totalTracked ? Math.round((count / totalTracked) * 1000) / 10 : 0 }))
    .sort((a, b) => b.count - a.count);

  const attention = enrichedAssets
    .filter((a) => a.motiveSignal != null)
    .sort((a, b) => {
      const aMove = Math.abs(a.signalChange ?? 0) + Math.abs((a.motiveSignal ?? 50) - 50) / 10;
      const bMove = Math.abs(b.signalChange ?? 0) + Math.abs((b.motiveSignal ?? 50) - 50) / 10;
      return bMove - aMove;
    })
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    totalTracked,
    holdingsCount: enrichedAssets.length,
    openBetCount: openBets.length,
    openPredictionCount: openPredictions.length,
    watchlistCount: watchlist.length,
    moduleMix,
    assets: enrichedAssets,
    sports: openBets.slice(0, 12),
    predictions: openPredictions.slice(0, 12),
    commonDrivers: [...driverCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([driver, count]) => ({ driver, count })),
    attention,
    dataNote: "Portfolio Intelligence summarizes recorded holdings and Motive evidence. It does not value the portfolio or recommend transactions when verified live prices are unavailable.",
  };
}

export async function buildDiscovery(userId: string | null) {
  const [rows, portfolioRows, watchlist] = await Promise.all([
    prisma.signalSnapshot.findMany({
      orderBy: { recordedAt: "desc" },
      take: 900,
      select: {
        symbol: true, motiveSignal: true, confidence: true, stance: true,
        evidenceJson: true, signalEvidenceJson: true, evidenceCount: true,
        signalEvidenceCount: true, engineVersion: true, recordedAt: true,
      },
    }),
    userId ? prisma.userPortfolio.findMany({ where: { userId } }) : Promise.resolve([]),
    userId ? listWatchlist(userId) : Promise.resolve([]),
  ]);
  const relevant = new Set<string>();
  for (const p of portfolioRows) for (const h of parseHoldings(p.holdingsJson)) if (h.symbol) relevant.add(String(h.symbol).toUpperCase());
  for (const w of watchlist) relevant.add(w.symbol.toUpperCase());
  const grouped = groupSignals(rows);
  const items = [...grouped.entries()].map(([symbol, history]) => {
    const latest = history[0]!;
    return {
      symbol,
      market: inferSignalMarket(latest),
      motiveSignal: safeSignal(latest.motiveSignal),
      evidenceConfidence: safeSignal(latest.confidence),
      stance: latest.stance,
      delta: signalChange(history),
      recordedAt: latest.recordedAt.toISOString(),
      evidenceCount: latest.signalEvidenceCount || latest.evidenceCount,
      relevant: relevant.has(symbol),
      evidence: evidenceSummary(latest),
    };
  }).filter((item) => item.motiveSignal != null)
    .sort((a, b) => Number(b.relevant) - Number(a.relevant) || Math.abs((b.delta ?? 0)) - Math.abs((a.delta ?? 0)) || (b.motiveSignal ?? 0) - (a.motiveSignal ?? 0))
    .slice(0, 160);
  return { generatedAt: new Date().toISOString(), items };
}

function torontoHour(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export async function buildMarketClose(userId: string | null) {
  const now = new Date();
  const since = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const rows = await prisma.signalSnapshot.findMany({
    where: { recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    take: 1600,
    select: {
      symbol: true, motiveSignal: true, confidence: true, stance: true,
      evidenceJson: true, signalEvidenceJson: true, evidenceCount: true,
      signalEvidenceCount: true, engineVersion: true, recordedAt: true,
    },
  });
  const relevant = new Set<string>();
  if (userId) {
    const [portfolios, watchlist] = await Promise.all([
      prisma.userPortfolio.findMany({ where: { userId } }),
      listWatchlist(userId),
    ]);
    for (const p of portfolios) for (const h of parseHoldings(p.holdingsJson)) if (h.symbol) relevant.add(String(h.symbol).toUpperCase());
    for (const w of watchlist) relevant.add(w.symbol.toUpperCase());
  }
  const grouped = groupSignals(rows);
  const changes = [...grouped.entries()].flatMap(([symbol, history]) => {
    if (!history.length) return [];
    const latest = history[0]!;
    const oldest = history[history.length - 1]!;
    const current = safeSignal(latest.motiveSignal);
    const prior = safeSignal(oldest.motiveSignal);
    return [{
      symbol,
      market: inferSignalMarket(latest),
      currentSignal: current,
      startSignal: prior,
      delta: current != null && prior != null ? Math.round((current - prior) * 10) / 10 : null,
      evidenceConfidence: safeSignal(latest.confidence),
      stance: latest.stance,
      relevant: relevant.has(symbol),
      latestAt: latest.recordedAt.toISOString(),
      evidence: evidenceSummary(latest),
    }];
  }).filter((x) => x.currentSignal != null);
  const strengthened = changes.filter((x) => (x.delta ?? 0) > 0).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)).slice(0, 8);
  const weakened = changes.filter((x) => (x.delta ?? 0) < 0).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).slice(0, 8);
  const carry = changes.sort((a, b) => Number(b.relevant) - Number(a.relevant) || Math.abs((b.currentSignal ?? 50) - 50) - Math.abs((a.currentSignal ?? 50) - 50)).slice(0, 10);
  return {
    generatedAt: now.toISOString(),
    mode: torontoHour(now) >= 16 ? "MARKET_CLOSE" : "SESSION_RECAP",
    strengthened,
    weakened,
    carry,
    summary: `${strengthened.length} signals strengthened and ${weakened.length} weakened in the recorded window. ${carry.filter((x) => x.relevant).length} carry item(s) overlap your holdings or watchlist.`,
    disclaimer: "Recorded signal changes are historical context, not a forecast or instruction.",
  };
}

export async function buildSinceAway(userId: string, sinceIso: string) {
  const parsed = new Date(sinceIso);
  const since = Number.isFinite(parsed.getTime()) ? parsed : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const maxSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const bounded = since < maxSince ? maxSince : since;
  const [rows, alerts] = await Promise.all([
    prisma.signalSnapshot.findMany({
      where: { recordedAt: { gt: bounded } },
      orderBy: { recordedAt: "desc" },
      take: 500,
      select: {
        symbol: true, motiveSignal: true, confidence: true, stance: true,
        evidenceJson: true, signalEvidenceJson: true, evidenceCount: true,
        signalEvidenceCount: true, engineVersion: true, recordedAt: true,
      },
    }),
    prisma.intelAlert.findMany({
      where: { userId, createdAt: { gt: bounded } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, module: true, symbol: true, title: true, body: true, confidence: true, createdAt: true },
    }),
  ]);
  const grouped = groupSignals(rows);
  const changes = [...grouped.entries()].map(([symbol, history]) => {
    const latest = history[0]!;
    const oldest = history[history.length - 1]!;
    const current = safeSignal(latest.motiveSignal);
    const start = safeSignal(oldest.motiveSignal);
    return {
      symbol,
      market: inferSignalMarket(latest),
      currentSignal: current,
      delta: current != null && start != null ? Math.round((current - start) * 10) / 10 : null,
      stance: latest.stance,
      recordedAt: latest.recordedAt.toISOString(),
    };
  }).sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0)).slice(0, 12);
  return {
    since: bounded.toISOString(),
    generatedAt: new Date().toISOString(),
    changes,
    alerts: alerts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    summary: changes.length || alerts.length
      ? `${changes.length} notable signal update(s) and ${alerts.length} alert(s) were recorded since your last visit.`
      : "No notable recorded signal changes or alerts since your last visit.",
  };
}
