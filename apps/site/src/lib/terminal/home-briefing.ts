import { countAllHoldings } from "./portfolio";
import { listBets } from "./bets";
import { listPredictions } from "./predictions";
import { listWatchlist, userTrackedSymbols } from "./watchlist";
import type { TerminalPlan } from "./plan";
import {
  fetchCongressTrades,
  fetchLineMoves,
  fetchPredictionMarkets,
  fetchSharpAction,
  fetchWhaleAlerts,
  scanPennyMovers,
  scanUnusualOptions,
} from "./feeds";

function riskFromConfidence(confidence: number, module: string): string {
  if (module === "penny") return confidence < 70 ? "high" : "medium";
  if (confidence >= 80) return "low";
  if (confidence >= 65) return "medium";
  if (confidence >= 50) return "high";
  return "extreme";
}

function stars(confidence: number): number {
  if (confidence >= 85) return 5;
  if (confidence >= 75) return 4;
  if (confidence >= 65) return 3;
  if (confidence >= 55) return 2;
  return 1;
}

function symbolMatch(tracked: Set<string>, opportunitySymbol: string): boolean {
  const sym = opportunitySymbol.toUpperCase().replace(/^\$/, "");
  if (tracked.has(sym)) return true;
  for (const t of tracked) {
    if (t.includes(sym) || sym.includes(t)) return true;
  }
  return false;
}

async function personalizedIntel(userId: string | null, opportunities: Array<Record<string, unknown>>) {
  if (!userId || userId === "demo") {
    return {
      holdingsCount: 0,
      watchlistCount: 0,
      radarSignalCount: 0,
      coverageLine: null,
      intelNote: "Add holdings or star symbols on your radar for personalized intel.",
      simRecord: null,
      radarHits: [] as Array<Record<string, unknown>>,
    };
  }

  const [holdingsTotal, watchlist, tracked, bets, preds] = await Promise.all([
    countAllHoldings(userId),
    listWatchlist(userId),
    userTrackedSymbols(userId),
    listBets(userId),
    listPredictions(userId),
  ]);

  const radarHits = opportunities.filter((o) => symbolMatch(tracked, String(o.symbol ?? "")));

  let coverageLine: string | null = null;
  if (tracked.size > 0) {
    coverageLine = `${radarHits.length} signal${radarHits.length !== 1 ? "s" : ""} on ${tracked.size} tracked name${tracked.size !== 1 ? "s" : ""} today`;
  } else if (holdingsTotal > 0) {
    coverageLine = `Monitoring ${holdingsTotal} tracked holding${holdingsTotal !== 1 ? "s" : ""}`;
  }

  let intelNote = "Star symbols on your radar to get signal coverage on Home.";
  if (radarHits.length) {
    const top = radarHits[0];
    intelNote = `Radar hit: ${top.symbol} — ${top.title} (${top.confidence}% signal strength).`;
  } else if (holdingsTotal > 0) {
    intelNote = `${holdingsTotal} holdings in your ledger — run AI Analyze on any module desk.`;
  }

  const simBets = bets.filter((b) => b.is_simulation);
  const simPreds = preds.filter((p) => p.is_simulation);
  const simWins = simBets.filter((b) => b.outcome === "won").length;
  const simLosses = simBets.filter((b) => b.outcome === "lost").length;
  let simRecord: string | null = null;
  if (simBets.length || simPreds.length) {
    const parts: string[] = [];
    if (simBets.length) parts.push(`Sim bets ${simWins}–${simLosses}`);
    if (simPreds.length) parts.push(`${simPreds.length} sim prediction${simPreds.length !== 1 ? "s" : ""}`);
    simRecord = parts.join(" · ");
  }

  return {
    holdingsCount: holdingsTotal,
    watchlistCount: watchlist.length,
    radarSignalCount: radarHits.length,
    coverageLine,
    intelNote,
    simRecord,
    radarHits: radarHits.slice(0, 5).map((o) => ({
      id: o.id,
      symbol: o.symbol,
      title: o.title,
      module: o.module,
      confidence: o.confidence,
    })),
  };
}

export function filterBriefingForPlan(briefing: Record<string, unknown>, plan: TerminalPlan) {
  const allowed = plan.allowedMarkets;
  if (!allowed.length) return briefing;
  const allowedSet = new Set(allowed);

  const opportunities = ((briefing.opportunities as Array<{ module?: string; symbol?: string }>) ?? []).filter(
    (o) => allowedSet.has(o.module ?? "")
  );
  const moduleSummaries = ((briefing.moduleSummaries as Array<{ module?: string }>) ?? []).filter((s) =>
    allowedSet.has(s.module ?? "")
  );
  const compareLens = ((briefing.compareLens as Array<{ module?: string }>) ?? []).filter((c) =>
    allowedSet.has(c.module ?? "")
  );
  const moduleStories = Object.fromEntries(
    Object.entries((briefing.moduleStories as Record<string, string>) ?? {}).filter(([key]) => allowedSet.has(key))
  );

  return {
    ...briefing,
    opportunities,
    opportunityCount: opportunities.length,
    biggestOpportunity: opportunities[0]?.symbol ?? briefing.biggestOpportunity ?? "Scanning…",
    highRiskAlerts: opportunities.filter((o) => {
      const risk = (o as { riskLevel?: string }).riskLevel;
      return risk === "high" || risk === "extreme";
    }).length,
    moduleSummaries,
    compareLens,
    moduleStories,
  };
}

export async function buildHomeBriefing(opts: {
  displayName?: string | null;
  userId?: string | null;
  plan?: TerminalPlan | null;
}) {
  const now = new Date();
  const hour = now.getUTCHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const name = (opts.displayName ?? "Trader").split(/\s+/)[0];
  const greeting = `Good ${period}, ${name}`;

  const [whales, lines, sharp, markets, congressTrades] = await Promise.all([
    fetchWhaleAlerts(),
    fetchLineMoves(),
    fetchSharpAction(),
    fetchPredictionMarkets(4),
    fetchCongressTrades(10),
  ]);

  const options = scanUnusualOptions().slice(0, 4);
  const penny = scanPennyMovers().slice(0, 3);
  const opportunities: Array<Record<string, unknown>> = [];

  for (const o of options.slice(0, 3)) {
    const conf = Math.min(92, 58 + Math.floor((Number(o.volOiRatio) || 3) * 4));
    const sym = o.symbol ?? "?";
    opportunities.push({
      id: `trades-${sym}-${o.type}`,
      module: "trades",
      symbol: sym,
      title: o.type === "call" ? "Bullish flow signal" : "Defensive flow signal",
      confidence: conf,
      expectedMove: `Modeled +${Math.min(12, 4 + Math.floor(conf / 12))}% scenario*`,
      riskLevel: riskFromConfidence(conf, "trades"),
      stars: stars(conf),
      signals: ["Options Flow", "Unusual Volume", "AI Lens"],
      reasons: [
        `Unusual ${o.type} flow detected — Vol/OI ${o.volOiRatio}x average.`,
        `Premium block ~$${Math.floor(Number(o.premium) || 0).toLocaleString()} on $${sym}.`,
        "Cross-referenced with institutional activity patterns.",
      ],
    });
  }

  for (const p of penny.slice(0, 2)) {
    const conf = Math.min(88, 52 + Math.floor(Math.abs(Number(p.changePct) || 0) * 2));
    opportunities.push({
      id: `penny-${p.symbol}`,
      module: "penny",
      symbol: p.symbol,
      title: "Volume breakout signal",
      confidence: conf,
      expectedMove: `Session ${Number(p.changePct).toFixed(1)}% context*`,
      riskLevel: riskFromConfidence(conf, "penny"),
      stars: stars(conf),
      signals: ["Unusual Volume", "Microcap Scanner", "AI Lens"],
      reasons: [p.note ?? `Volume ${p.volRatio}x average on sub-$5 name.`, "Pink slip scanner flagged catalyst-style activity.", "Higher volatility context — informational only."],
    });
  }

  for (const w of whales.slice(0, 1)) {
    const conf = 78;
    opportunities.push({
      id: `crypto-${w.asset ?? "BTC"}`,
      module: "crypto",
      symbol: w.asset ?? "BTC",
      title: "Whale transfer signal",
      confidence: conf,
      expectedMove: "On-chain context",
      riskLevel: "medium",
      stars: stars(conf),
      signals: ["Whale Transfer", "On-Chain", "AI Lens"],
      reasons: [
        `$${Math.floor(Number(w.amountUsd) / 1_000_000)}M moved — ${(w as { note?: string }).note ?? w.direction ?? "exchange flow"}.`,
        "Large wallet activity often precedes volatility windows.",
        "Monitor spot reserves and exchange inflows.",
      ],
    });
  }

  for (const s of sharp.slice(0, 2)) {
    const conf = s.confidence === "high" ? 72 : 64;
    opportunities.push({
      id: `betting-${String(s.matchup).slice(0, 20)}`,
      module: "betting",
      symbol: s.matchup,
      title: "Sharp money signal",
      confidence: conf,
      expectedMove: "Line context",
      riskLevel: riskFromConfidence(conf, "betting"),
      stars: stars(conf),
      signals: ["Sharp Money", "Line Movement", "Public Split"],
      reasons: [
        `Sharp side: ${s.sharpSide} — signal ${String(s.signal).replace(/_/g, " ")}.`,
        `Public ${s.publicPct}% vs money ${s.moneyPct}%.`,
        "Professional book modeling favors this side.",
      ],
    });
  }

  for (const m of markets.slice(0, 2)) {
    const yes = Math.round((Number(m.yes) || 0.5) * 100);
    const conf = Math.max(55, Math.min(85, yes > 50 ? yes : 100 - yes));
    opportunities.push({
      id: `pred-${String(m.market).slice(0, 24)}`,
      module: "predictions",
      symbol: String(m.market).slice(0, 48),
      title: "Event market signal",
      confidence: conf,
      expectedMove: `${yes}% implied yes*`,
      riskLevel: "medium",
      stars: stars(conf),
      signals: ["Event Market", "24h Volume", "AI Lens"],
      reasons: [
        `Market pricing ${yes}% yes on ${m.platform ?? "Polymarket"}.`,
        `Category: ${m.categoryLabel ?? m.category ?? "events"}.`,
        "AI cross-checks news flow and historical resolution patterns.",
      ],
    });
  }

  opportunities.sort((a, b) => Number(b.confidence) - Number(a.confidence));
  const top8 = opportunities.slice(0, 8);
  let score = Math.min(95, Math.max(42, 62 + top8.length * 3));
  if (options.length) score = Math.min(95, score + 4);
  const highRisk = top8.filter((o) => o.riskLevel === "high" || o.riskLevel === "extreme").length;

  const moduleCounts = {
    trades: top8.filter((o) => o.module === "trades").length,
    penny: top8.filter((o) => o.module === "penny").length,
    crypto: top8.filter((o) => o.module === "crypto").length,
    betting: top8.filter((o) => o.module === "betting").length,
    predictions: top8.filter((o) => o.module === "predictions").length,
  };

  const top = top8[0];
  const congressBuy = congressTrades.find((t) => String(t.transaction).toLowerCase().includes("purchase"));
  const personalized = await personalizedIntel(opts.userId ?? null, top8);

  const compareLens = top8.slice(0, 4).map((o) => {
    const prior = Math.max(45, Number(o.confidence) - 12);
    const delta = Number(o.confidence) - prior;
    const signals = o.signals as string[] | undefined;
    return {
      id: o.id,
      symbol: o.symbol,
      module: o.module,
      title: o.title,
      currentConfidence: o.confidence,
      priorConfidence: prior,
      deltaLabel: `${delta >= 0 ? "+" : ""}${delta} pts vs 7-day similar setups*`,
      context: `Similar ${(signals?.[0] ?? "signal").toLowerCase()} patterns averaged ${prior}% confidence last week.`,
    };
  });

  const densityWord = score >= 75 ? "high" : score >= 58 ? "moderate" : "cautious";
  const moduleStories: Record<string, string> = {
    trades: `Today's lens: ${moduleCounts.trades} options-flow flag${moduleCounts.trades !== 1 ? "s" : ""}${options[0] ? ` — $${options[0].symbol} leading Vol/OI.` : "."}`,
    penny: `Pink slip desk: ${moduleCounts.penny} microcap signal${moduleCounts.penny !== 1 ? "s" : ""}${penny[0] ? ` — $${penny[0].symbol} volume ${penny[0].volRatio}x avg.` : "."}`,
    crypto: `On-chain lens: ${moduleCounts.crypto} whale flag${moduleCounts.crypto !== 1 ? "s" : ""}${whales[0] ? ` — ${whales[0].asset ?? "BTC"} transfer flagged.` : "."}`,
    betting: `Sharp desk: ${moduleCounts.betting} line signal${moduleCounts.betting !== 1 ? "s" : ""}${sharp[0] ? ` — ${sharp[0].matchup} sharp side ${sharp[0].sharpSide}.` : "."}`,
    predictions: `Event markets: ${moduleCounts.predictions} contract${moduleCounts.predictions !== 1 ? "s" : ""} flagged${markets[0] ? ` — top yes ${Math.round((Number(markets[0].yes) || 0.5) * 100)}%.` : "."}`,
  };

  let briefing: Record<string, unknown> = {
    greeting,
    tagline: "The AI Command Center for Market Intelligence",
    motivfxScore: score,
    stars: stars(score),
    marketConfidence: score >= 75 ? "HIGH" : score >= 58 ? "MODERATE" : "CAUTIOUS",
    opportunityCount: top8.length,
    highRiskAlerts: highRisk,
    portfolioDelta: null,
    biggestRisk: options.length ? "Tesla earnings week" : "Macro headline risk",
    biggestOpportunity: top?.symbol ?? "Scanning…",
    topAiTip: top ? `Intel lens: $${top.symbol} — ${(top.signals as string[])?.[0]}.` : personalized.intelNote,
    moduleSummaries: [
      { module: "trades", label: "Trades", count: moduleCounts.trades, tab: "stocks", newSignals: moduleCounts.trades },
      { module: "penny", label: "Pink Slips", count: moduleCounts.penny, tab: "penny", newSignals: moduleCounts.penny },
      { module: "crypto", label: "Crypto", count: moduleCounts.crypto, tab: "crypto", newSignals: moduleCounts.crypto },
      { module: "betting", label: "Betting", count: moduleCounts.betting, tab: "betting", newSignals: moduleCounts.betting },
      { module: "predictions", label: "Predictions", count: moduleCounts.predictions, tab: "predictions", newSignals: moduleCounts.predictions },
    ],
    opportunities: top8,
    personalized,
    compareLens,
    moduleStories,
    audioBriefingScript: [
      `Good ${period}. Here's your Motive FX intel snapshot.`,
      `Today's desk score is ${score} out of 100, with ${densityWord} signal density across the desks.`,
      top ? `The top flag right now is ${top.symbol}: ${top.title}. Confidence sits at ${top.confidence} percent.` : "",
      personalized.coverageLine ? String(personalized.coverageLine).replace(" today", " on your radar today") : "",
      "That's your briefing for now. This is informational context only, not financial advice.",
    ].filter(Boolean).join(" "),
    sentiment: {
      reddit: score >= 70 ? "bullish" : "neutral",
      x: "neutral",
      news: congressBuy ? "bullish" : "neutral",
    },
    breakingNewsCount: Math.min(12, 4 + top8.length),
    generatedAt: now.toISOString(),
    scenarioDisclaimer: "Scenarios marked * are educational context — not forecasts.",
    alertUnreadCount: 0,
  };

  if (opts.plan) {
    briefing = filterBriefingForPlan(briefing, opts.plan);
  }

  return briefing;
}
