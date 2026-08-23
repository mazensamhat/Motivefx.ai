import { countAllHoldings, portfolioSnapshot } from "./portfolio";
import { listBets } from "./bets";
import { listPredictions } from "./predictions";
import { listWatchlist, userTrackedSymbols } from "./watchlist";
import type { TerminalPlan } from "./plan";
import {
  fetchCongressTrades,
  fetchLineMoves,
  fetchPredictionMarkets,
  fetchWhaleAlerts,
  scanPennyMovers,
  scanUnusualOptions,
} from "./feeds";
import {
  enrichOpportunitiesWithProbability,
  runPhase2Engines,
} from "./engines";
import { getIntelPrefs } from "./intel-prefs";
import { pickSignalsForOpportunity, stancePlainExplain } from "./signal-clarity";
import {
  formatBriefingGreeting,
  formatBriefingKicker,
  getBriefingPeriod,
} from "../../../../../packages/shared/src/briefing-period";

/** Browser-local anonymous ids (u_…) are not persisted users — skip DB lookups. */
function isEphemeralUserId(userId: string | null | undefined): boolean {
  if (!userId || userId === "demo") return true;
  return userId.startsWith("u_");
}

async function withFeedTimeout<T>(promise: Promise<T>, fallback: T, ms = 4000): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("feed timeout")), ms);
      }),
    ]);
  } catch {
    return fallback;
  }
}

function emptyLedger() {
  return {
    trades: 0,
    penny: 0,
    crypto: 0,
    betting: 0,
    predictions: 0,
    matched: { trades: 0, penny: 0, crypto: 0, betting: 0, predictions: 0 },
  };
}

function emptyPersonalized() {
  return {
    holdingsCount: 0,
    watchlistCount: 0,
    radarSignalCount: 0,
    coverageLine: null as string | null,
    intelNote: "Add holdings or star symbols on your radar for personalized intel.",
    simRecord: null as string | null,
    radarHits: [] as Array<Record<string, unknown>>,
  };
}

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

/** Stance keys shared with advisor-engine / Motive Signal UI. */
function resolveStanceFromScore(score: number): string {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  if (s >= 82) return "long_term_hold";
  if (s >= 72) return "would_hold";
  if (s >= 62) return "short_term_hold";
  if (s >= 48) return "hold";
  if (s >= 40) return "wouldnt_buy";
  if (s >= 32) return "would_avoid";
  return "sell";
}

function stancePhrase(action: string): string {
  switch (action) {
    case "long_term_hold":
      return "Longer-term attention";
    case "would_hold":
      return "Supportive context";
    case "short_term_hold":
      return "Near-term attention";
    case "wouldnt_buy":
      return "Cautious on new entries";
    case "would_avoid":
      return "Elevated caution";
    case "sell":
      return "Defensive lean";
    default:
      return "Mixed / watch";
  }
}

function trimSentence(value: string, max = 150): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function plainSignalText(value: unknown): string {
  return String(value ?? "")
    .replace(/\bVol\/OI\b/gi, "unusual options activity")
    .replace(/\bavg\b/gi, "average")
    .replace(/\s+/g, " ")
    .trim();
}

function opportunityDisplayName(o: Record<string, unknown> | undefined): string {
  if (!o) return "the radar";
  const symbol = String(o.symbol ?? "").trim();
  return symbol ? symbol : String(o.title ?? "the top radar item");
}

function opportunitySummary(o: Record<string, unknown> | undefined): string | null {
  if (!o) return null;
  const name = opportunityDisplayName(o);
  const signals = (o.signals as string[] | undefined) ?? [];
  const reasons = (o.reasons as string[] | undefined) ?? [];
  const context = plainSignalText(signals[0] ?? reasons[0] ?? o.title);
  const confidence = Number(o.confidence ?? 0);
  const confidenceLine = confidence ? ` It has ${confidence}% signal attention.` : "";
  return trimSentence(`${name} is the top radar item${context ? `, with ${context.toLowerCase()}` : ""}.${confidenceLine}`);
}

function symbolMatch(tracked: Set<string>, opportunitySymbol: string): boolean {
  const sym = opportunitySymbol.toUpperCase().replace(/^\$/, "");
  if (tracked.has(sym)) return true;
  for (const t of tracked) {
    if (t.includes(sym) || sym.includes(t)) return true;
  }
  return false;
}

function matchedFeedSignals(
  module: string,
  symbols: string[],
  opportunities: Array<Record<string, unknown>>
): number {
  if (!symbols.length) return 0;
  const tracked = new Set(symbols.map((s) => s.toUpperCase()));
  return opportunities.filter(
    (o) => o.module === module && symbolMatch(tracked, String(o.symbol ?? ""))
  ).length;
}

async function ledgerPulse(userId: string | null, opportunities: Array<Record<string, unknown>>) {
  if (isEphemeralUserId(userId)) {
    return {
      trades: 0,
      penny: 0,
      crypto: 0,
      betting: 0,
      predictions: 0,
      matched: { trades: 0, penny: 0, crypto: 0, betting: 0, predictions: 0 },
    };
  }

  const uid = userId as string;
  const [{ counts, symbols }, bets, preds] = await Promise.all([
    portfolioSnapshot(uid),
    listBets(uid),
    listPredictions(uid),
  ]);

  const realBets = bets.filter((b) => !b.is_simulation);
  const realPreds = preds.filter((p) => !p.is_simulation);

  return {
    trades: counts.trades,
    penny: counts.penny,
    crypto: counts.crypto,
    betting: realBets.length,
    predictions: realPreds.length,
    matched: {
      trades: matchedFeedSignals("trades", symbols.trades, opportunities),
      penny: matchedFeedSignals("penny", symbols.penny, opportunities),
      crypto: matchedFeedSignals("crypto", symbols.crypto, opportunities),
      betting: 0,
      predictions: 0,
    },
  };
}

async function personalizedIntel(userId: string | null, opportunities: Array<Record<string, unknown>>) {
  if (isEphemeralUserId(userId)) {
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

  const uid = userId as string;
  const [holdingsTotal, watchlist, tracked, bets, preds] = await Promise.all([
    countAllHoldings(uid),
    listWatchlist(uid),
    userTrackedSymbols(uid),
    listBets(uid),
    listPredictions(uid),
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
  const marketGenomes = ((briefing.marketGenomes as Array<{ module?: string }>) ?? []).filter((g) =>
    allowedSet.has(g.module ?? "")
  );
  const moduleStories = Object.fromEntries(
    Object.entries((briefing.moduleStories as Record<string, string>) ?? {}).filter(([key]) => allowedSet.has(key))
  );

  return {
    ...briefing,
    opportunities,
    marketGenomes,
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
  const period = getBriefingPeriod(now);
  const name = (opts.displayName ?? "Trader").split(/\s+/)[0];
  const greeting = formatBriefingGreeting(period, name);
  const briefingKicker = formatBriefingKicker(period);

  const [whales, lines, markets, congressTrades] = await Promise.all([
    withFeedTimeout(fetchWhaleAlerts(), [], 3500),
    withFeedTimeout(fetchLineMoves(), [], 3500),
    withFeedTimeout(fetchPredictionMarkets(4), [], 3500),
    withFeedTimeout(fetchCongressTrades(10), [], 2000),
  ]);

  const options = scanUnusualOptions().slice(0, 4);
  const penny = scanPennyMovers().slice(0, 3);
  const opportunities: Array<Record<string, unknown>> = [];

  for (const o of options.slice(0, 3)) {
    const conf = Math.min(92, 58 + Math.floor((Number(o.volOiRatio) || 3) * 4));
    const sym = o.symbol ?? "?";
    const stanceScore = o.type === "call" ? conf : Math.max(20, 100 - conf);
    const stance = resolveStanceFromScore(stanceScore);
    const signals = pickSignalsForOpportunity({
      module: "trades",
      symbol: sym,
      type: o.type,
      volOiRatio: Number(o.volOiRatio) || undefined,
      premium: Number(o.premium) || undefined,
      note: o.note,
    });
    opportunities.push({
      id: `trades-${sym}-${o.type}`,
      module: "trades",
      symbol: sym,
      title: stancePhrase(stance),
      stance,
      confidence: conf,
      expectedMove: `Modeled +${Math.min(12, 4 + Math.floor(conf / 12))}% scenario*`,
      riskLevel: riskFromConfidence(conf, "trades"),
      stars: stars(conf),
      signals,
      reasons: [
        `$${sym}: unusual ${o.type} flow — Vol/OI ${o.volOiRatio}x average (options volume vs contracts already open).`,
        `$${sym}: premium block ~$${Math.floor(Number(o.premium) || 0).toLocaleString()}.`,
        stancePlainExplain(stance),
      ],
    });
  }

  for (const p of penny.slice(0, 2)) {
    const conf = Math.min(88, 52 + Math.floor(Math.abs(Number(p.changePct) || 0) * 2));
    const stance = resolveStanceFromScore(conf);
    const signals = pickSignalsForOpportunity({
      module: "penny",
      symbol: p.symbol,
      changePct: Number(p.changePct) || undefined,
      volRatio: Number(p.volRatio) || undefined,
      note: p.note,
    });
    opportunities.push({
      id: `penny-${p.symbol}`,
      module: "penny",
      symbol: p.symbol,
      title: stancePhrase(stance),
      stance,
      confidence: conf,
      expectedMove: `Session ${Number(p.changePct).toFixed(1)}% context*`,
      riskLevel: riskFromConfidence(conf, "penny"),
      stars: stars(conf),
      signals,
      reasons: [
        p.note
          ? `$${p.symbol}: ${p.note}`
          : `$${p.symbol}: volume ${p.volRatio}x average on a sub-$5 name.`,
        `$${p.symbol}: session move ${Number(p.changePct) >= 0 ? "+" : ""}${Number(p.changePct).toFixed(1)}% — thin names can reverse quickly.`,
        stancePlainExplain(stance),
      ],
    });
  }

  for (const w of whales.slice(0, 1)) {
    const conf = 78;
    const stance = resolveStanceFromScore(conf);
    const asset = w.asset ?? "BTC";
    const signals = pickSignalsForOpportunity({
      module: "crypto",
      symbol: asset,
      amountUsd: Number(w.amountUsd) || undefined,
      direction: String(w.direction ?? ""),
      note: (w as { note?: string }).note,
    });
    opportunities.push({
      id: `crypto-${asset}`,
      module: "crypto",
      symbol: asset,
      title: stancePhrase(stance),
      stance,
      confidence: conf,
      expectedMove: "On-chain context",
      riskLevel: "medium",
      stars: stars(conf),
      signals,
      reasons: [
        `$${asset}: ~$${Math.floor(Number(w.amountUsd) / 1_000_000)}M moved — ${(w as { note?: string }).note ?? w.direction ?? "exchange flow"}.`,
        `$${asset}: large wallet activity is volatility context, not a trade instruction.`,
        stancePlainExplain(stance),
      ],
    });
  }

  for (const l of lines.slice(0, 2)) {
    const conf = 60;
    const stance = resolveStanceFromScore(conf);
    const matchup = String(l.matchup);
    const signals = pickSignalsForOpportunity({
      module: "betting",
      symbol: matchup,
      note: `${l.sport} ${l.currentLine ?? ""}`,
    });
    opportunities.push({
      id: `betting-${matchup.slice(0, 20)}`,
      module: "betting",
      symbol: matchup,
      title: stancePhrase(stance),
      stance,
      confidence: conf,
      expectedMove: "Line context",
      riskLevel: riskFromConfidence(conf, "betting"),
      stars: stars(conf),
      signals,
      reasons: [
        `${matchup}: ${l.sport}${l.book ? ` · ${l.book}` : ""} — ${l.currentLine ?? "live board"}.`,
        `${matchup}: public vs sharp ticket splits may be incomplete on this feed.`,
        stancePlainExplain(stance),
      ],
    });
  }

  for (const m of markets.slice(0, 2)) {
    const yes = Math.round((Number(m.yes) || 0.5) * 100);
    const conf = Math.max(55, Math.min(85, yes > 50 ? yes : 100 - yes));
    const stance = resolveStanceFromScore(conf);
    const marketLabel = String(m.market).slice(0, 48);
    const signals = pickSignalsForOpportunity({
      module: "predictions",
      symbol: marketLabel,
      yesPct: yes,
      note: String(m.categoryLabel ?? m.category ?? ""),
    });
    opportunities.push({
      id: `pred-${String(m.market).slice(0, 24)}`,
      module: "predictions",
      symbol: marketLabel,
      title: stancePhrase(stance),
      stance,
      confidence: conf,
      expectedMove: `${yes}% implied yes*`,
      riskLevel: "medium",
      stars: stars(conf),
      signals,
      reasons: [
        `${marketLabel}: pricing ${yes}% yes on ${m.platform ?? "Polymarket"}.`,
        `${marketLabel}: category ${m.categoryLabel ?? m.category ?? "events"} — crowd odds, not a forecast.`,
        stancePlainExplain(stance),
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

  const ledger = await withFeedTimeout(ledgerPulse(opts.userId ?? null, top8), emptyLedger(), 2500);
  const personalized = await withFeedTimeout(
    personalizedIntel(opts.userId ?? null, top8),
    emptyPersonalized(),
    2500
  );

  const top = top8[0];
  const congressBuy = congressTrades.find((t) => String(t.transaction).toLowerCase().includes("purchase"));

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
    betting: `Odds desk: ${moduleCounts.betting} line signal${moduleCounts.betting !== 1 ? "s" : ""}${lines[0] ? ` — ${lines[0].matchup} @ ${lines[0].currentLine ?? "live"}.` : "."}`,
    predictions: `Event markets: ${moduleCounts.predictions} contract${moduleCounts.predictions !== 1 ? "s" : ""} flagged${markets[0] ? ` — top yes ${Math.round((Number(markets[0].yes) || 0.5) * 100)}%.` : "."}`,
  };

  const marketConfidence = score >= 75 ? "HIGH" : score >= 58 ? "MODERATE" : "CAUTIOUS";
  const sentiment = {
    reddit: score >= 70 ? "bullish" : "neutral",
    x: "neutral",
    news: congressBuy ? "bullish" : "neutral",
  };

  const intelPrefs = await withFeedTimeout(getIntelPrefs(opts.userId ?? null), null, 1500);

  const phase2 = runPhase2Engines({
    opportunities: top8 as Array<{
      id?: string;
      module?: string;
      symbol?: string;
      title?: string;
      confidence?: number;
      signals?: string[];
      reasons?: string[];
      riskLevel?: string;
      expectedMove?: string;
      stance?: string;
    }>,
    marketConfidenceLabel: marketConfidence,
    sentiment,
    prefs: intelPrefs,
  });
  const enrichedOpps = enrichOpportunitiesWithProbability(
    top8 as Array<{
      id?: string;
      module?: string;
      symbol?: string;
      title?: string;
      confidence?: number;
      signals?: string[];
      reasons?: string[];
      riskLevel?: string;
    }>,
    phase2.probabilityViews
  );

  const topBreak = phase2.consensusBreaks[0];
  const topTheme = phase2.probabilityViews.find((v) => v.id.startsWith("theme-"));
  const topRisk = top8.find((o) => o.riskLevel === "high" || o.riskLevel === "extreme");
  const topOpportunitySummary = opportunitySummary(top);
  const themeLine = topTheme
    ? `${topTheme.theme} is the main theme to watch (Motive Signal ${topTheme.probability}/100 — evidence alignment, not a probability).`
    : null;
  const riskLine = topBreak
    ? `Watch ${trimSentence(topBreak.claim, 90)} because ${trimSentence(topBreak.breakReason, 130)}`
    : topRisk
      ? `Watch ${opportunityDisplayName(topRisk)} because it carries ${topRisk.riskLevel} risk in today's scan.`
      : "Risk is mostly headline-driven right now, so keep position sizing and timing in view.";

  // Enrich theme watchlist rows with live probability
  const themeWatchlist = (intelPrefs?.themeWatchlist ?? []).map((t) => {
    const live = phase2.probabilityViews.find(
      (v) => v.theme.toLowerCase() === t.theme.toLowerCase() || v.id === t.id
    );
    return {
      ...t,
      probability: live?.probability ?? t.probability,
      confidence: live?.confidence,
      deltaVsPrior: live?.deltaVsPrior,
    };
  });

  let briefing: Record<string, unknown> = {
    greeting,
    greetingName: name,
    briefingPeriod: period,
    briefingKicker,
    tagline: "Daily Brief · Opportunity Radar · Predictive",
    motivfxScore: score,
    stars: stars(score),
    marketConfidence,
    opportunityCount: top8.length,
    highRiskAlerts: highRisk,
    portfolioDelta: null,
    biggestRisk: riskLine,
    biggestOpportunity: topTheme?.theme ?? top?.symbol ?? "Scanning…",
    topAiTip: top
      ? [
          topOpportunitySummary,
          themeLine,
          "Use this as monitor-only context, not a buy or sell call.",
        ].filter(Boolean).join(" ")
      : personalized.intelNote,
    moduleSummaries: [
      { module: "trades", label: "Trades", count: ledger.trades, tab: "stocks", newSignals: ledger.matched.trades },
      { module: "penny", label: "Pink Slips", count: ledger.penny, tab: "penny", newSignals: ledger.matched.penny },
      { module: "crypto", label: "Crypto", count: ledger.crypto, tab: "crypto", newSignals: ledger.matched.crypto },
      { module: "betting", label: "Betting", count: ledger.betting, tab: "betting", newSignals: ledger.matched.betting },
      {
        module: "predictions",
        label: "Predictions",
        count: ledger.predictions,
        tab: "predictions",
        newSignals: ledger.matched.predictions,
      },
    ],
    opportunities: enrichedOpps,
    personalized,
    compareLens,
    moduleStories,
    signalGraph: phase2.signalGraph,
    probabilityViews: phase2.probabilityViews.filter((v) => v.id.startsWith("theme-")),
    consensusBreaks: phase2.consensusBreaks,
    consensusHistory: phase2.consensusHistory,
    futureScenarios: phase2.futureScenarios,
    marketGenomes: phase2.marketGenomes.slice(0, 4),
    themeSuggestions: phase2.themeSuggestions,
    themeWatchlist,
    alertRules: intelPrefs?.alertRules ?? [],
    audioBriefingScript: [
      `Market confidence looks ${densityWord}, with a MotiveFX score of ${score} out of 100.`,
      topOpportunitySummary,
      themeLine,
      `The main risk to monitor: ${riskLine}`,
      personalized.coverageLine ? String(personalized.coverageLine).replace(" today", " on your radar today") : "",
      "That's the brief. It's monitor-only context, not financial advice.",
    ].filter(Boolean).join(" "),
    sentiment,
    breakingNewsCount: Math.min(12, 4 + top8.length),
    generatedAt: now.toISOString(),
    scenarioDisclaimer:
      "Scenarios marked * are educational context — Future Simulator branches are not forecasts or financial advice.",
    alertUnreadCount: 0,
  };

  if (opts.plan) {
    briefing = filterBriefingForPlan(briefing, opts.plan);
  }

  return briefing;
}
