import { prisma } from "@motivefx/database";
import { json } from "@/lib/api";
import { requireFeature } from "@/lib/terminal/access";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { loadPortfolio } from "@/lib/terminal/portfolio";
import { listBets } from "@/lib/terminal/bets";
import { listPredictions } from "@/lib/terminal/predictions";
import { listWatchlist } from "@/lib/terminal/watchlist";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "portfolio_intelligence");
    const userId = auth.session.user.id;
    const [trades, crypto, penny, bets, predictions, watchlist] = await Promise.all([
      loadPortfolio(userId, "trades"), loadPortfolio(userId, "crypto"), loadPortfolio(userId, "penny"),
      listBets(userId), listPredictions(userId), listWatchlist(userId),
    ]);
    const positions = [
      ...trades.map((h) => ({ module: "trades", label: "Stocks", symbol: h.symbol, quantity: h.shares ?? null, avgCost: h.avg_cost ?? null })),
      ...penny.map((h) => ({ module: "penny", label: "Pink Sheets", symbol: h.symbol, quantity: h.shares ?? null, avgCost: h.avg_cost ?? null })),
      ...crypto.map((h) => ({ module: "crypto", label: "Crypto", symbol: h.symbol, quantity: h.amount ?? null, avgCost: h.avg_cost ?? null })),
      ...bets.filter((b) => !b.is_simulation).map((b) => ({ module: "betting", label: "Sports", symbol: b.matchup, quantity: null, avgCost: null, status: b.status, pick: b.pick })),
      ...predictions.filter((p) => !p.is_simulation).map((p) => ({ module: "predictions", label: "Predictions", symbol: p.market, quantity: null, avgCost: null, status: p.status, pick: p.pick })),
    ];
    const symbols = [...new Set(positions.map((p) => p.symbol.toUpperCase()))];
    const snapshots = symbols.length ? await prisma.signalSnapshot.findMany({
      where: { symbol: { in: symbols } }, orderBy: { recordedAt: "desc" }, take: Math.min(1000, symbols.length * 5),
      select: { symbol: true, motiveSignal: true, confidence: true, stance: true, recordedAt: true },
    }) : [];
    const latest = new Map<string, typeof snapshots[number]>();
    const previous = new Map<string, typeof snapshots[number]>();
    for (const s of snapshots) {
      const key = s.symbol.toUpperCase();
      if (!latest.has(key)) latest.set(key, s);
      else if (!previous.has(key)) previous.set(key, s);
    }
    const enriched = positions.map((p) => {
      const key = p.symbol.toUpperCase();
      const now = latest.get(key), before = previous.get(key);
      return {
        ...p, motiveSignal: now?.motiveSignal ?? null, evidenceConfidence: now?.confidence ?? null, stance: now?.stance ?? null,
        signalChange: now?.motiveSignal != null && before?.motiveSignal != null ? Math.round((now.motiveSignal - before.motiveSignal) * 10) / 10 : null,
        signalRecordedAt: now?.recordedAt.toISOString() ?? null,
      };
    });
    const marketCounts = ["trades", "penny", "crypto", "betting", "predictions"].map((module) => ({
      module, count: enriched.filter((p) => p.module === module).length,
    }));
    const total = enriched.length;
    const largest = [...marketCounts].sort((a,b) => b.count-a.count)[0];
    return json({
      generatedAt: new Date().toISOString(), totalPositions: total, positions: enriched, marketCounts,
      signalCoverage: enriched.filter((p) => p.motiveSignal != null).length,
      concentration: total && largest ? { module: largest.module, count: largest.count, sharePct: Math.round(largest.count / total * 100) } : null,
      watchlistCount: watchlist.length,
      note: "Concentration is count-based, not market-value weighted. Motive Signals are evidence strength, not return forecasts.",
    });
  } catch (err) { return accessErrorResponse(err); }
}
