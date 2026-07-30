import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import {
  analyzeStockPortfolio,
  analyzeCryptoPortfolio,
  analyzePennyPortfolio,
  analyzeBets,
  analyzePredictions,
} from "@/lib/terminal/advisor-engine";
import { loadPortfolio, portfolioSnapshot } from "@/lib/terminal/portfolio";
import { listBets } from "@/lib/terminal/bets";
import { listPredictions } from "@/lib/terminal/predictions";
import { listWatchlist } from "@/lib/terminal/watchlist";
import {
  fetchCongressTrades,
  fetchWhaleAlerts,
  scanPennyMovers,
  scanUnusualOptions,
} from "@/lib/terminal/feeds";
import type { TerminalPlan } from "@/lib/terminal/plan";

export type AskNavigateTab =
  | "home"
  | "stocks"
  | "penny"
  | "crypto"
  | "betting"
  | "predictions";

export type AskAction = { type: "navigate"; tab: AskNavigateTab };

function isEphemeralUserId(userId: string | null | undefined): boolean {
  if (!userId || userId === "demo") return true;
  return userId.startsWith("u_");
}

const NAV_GUIDE: Record<string, string> = {
  home: "Home shows your Daily Brief, Opportunity Radar, Probability Engine, Consensus Break, Future Simulator, Theme Watchlist, predictive alerts, Relationship Engine, and module pulse.",
  stocks:
    "Trades desk: add stock holdings, run AI Analyze for Motive Signal stances, and review unusual options / congress flow.",
  penny:
    "Pink Slips desk: microcap & OTC-style radar for sub-$5 names, volume spikes, and catalyst context. Higher volatility — informational only.",
  crypto:
    "Crypto desk: ledger units, whale alerts, and on-chain context. Use AI Analyze for stance labels on your holdings.",
  betting:
    "Bets desk: open slips, live odds context, and grader notes. Informational odds context — not a wager recommendation.",
  predictions:
    "Predictions desk: event markets (Polymarket-style feeds) and your positions. Stances reflect crowd odds context.",
  holdings:
    "Add holdings on each market desk (Trades / Pink Slips / Crypto) via the portfolio / ledger panel. That unlocks personalized radar hits on Home.",
  watchlist:
    "Star symbols on your radar / watchlist so Home can highlight signals that match what you track.",
  brokers:
    "Apps & brokers: open from Account or the Apps button in the header. Pick where you trade so confirm actions can deep-link out. Skip anytime.",
  glossary:
    "Signal Glossary explains Motive Signal terms. Open it from the Home briefing actions or the sidebar glossary control.",
};

export async function buildUserProfile(userId: string) {
  if (isEphemeralUserId(userId)) {
    return {
      ephemeral: true,
      holdings: { trades: [] as string[], crypto: [] as string[], penny: [] as string[] },
      openBets: 0,
      openPredictions: 0,
      watchlist: [] as string[],
      note: "No saved ledger yet — guest/demo session. Sign-in holdings unlock personalized advice.",
    };
  }

  const [snap, bets, preds, watch] = await Promise.all([
    portfolioSnapshot(userId),
    listBets(userId),
    listPredictions(userId),
    listWatchlist(userId),
  ]);

  return {
    ephemeral: false,
    holdings: {
      trades: snap.symbols.trades.slice(0, 12),
      crypto: snap.symbols.crypto.slice(0, 12),
      penny: snap.symbols.penny.slice(0, 12),
      tradesCount: snap.counts.trades,
      cryptoCount: snap.counts.crypto,
      pennyCount: snap.counts.penny,
    },
    openBets: bets.filter((b) => !b.outcome || b.outcome === "open").length,
    openPredictions: preds.filter((p) => !p.outcome || p.outcome === "open").length,
    watchlist: watch.slice(0, 12).map((w) => w.symbol),
    note: "Use these holdings when the user says “my portfolio” — prefer scan_all_portfolios for a full book review.",
  };
}

export async function toolGetBriefing(opts: {
  displayName?: string | null;
  userId: string;
  plan: TerminalPlan | null;
}) {
  const briefing = await buildHomeBriefing({
    displayName: opts.displayName,
    userId: opts.userId,
    plan: opts.plan,
  });
  const opps = ((briefing.opportunities as Array<Record<string, unknown>>) ?? []).slice(0, 5);
  return {
    greeting: briefing.greeting,
    motivfxScore: briefing.motivfxScore,
    marketConfidence: briefing.marketConfidence,
    opportunityCount: briefing.opportunityCount,
    biggestOpportunity: briefing.biggestOpportunity,
    biggestRisk: briefing.biggestRisk,
    topAiTip: briefing.topAiTip,
    coverageLine: (briefing.personalized as { coverageLine?: string } | undefined)?.coverageLine,
    consensusBreaks: ((briefing.consensusBreaks as Array<Record<string, unknown>>) ?? [])
      .slice(0, 2)
      .map((b) => ({
        claim: b.claim,
        breakReason: b.breakReason,
        divergenceScore: b.divergenceScore,
        symbols: b.relatedSymbols,
      })),
    probabilityThemes: ((briefing.probabilityViews as Array<Record<string, unknown>>) ?? [])
      .slice(0, 3)
      .map((v) => ({
        theme: v.theme,
        probability: v.probability,
        confidence: v.confidence,
        beneficiaries: v.beneficiaries,
      })),
    futureSeed: (briefing.futureScenarios as { seedEvent?: string } | undefined)?.seedEvent,
    themeWatchlist: ((briefing.themeWatchlist as Array<Record<string, unknown>>) ?? [])
      .slice(0, 5)
      .map((t) => ({ theme: t.theme, probability: t.probability })),
    alertRulesOn: ((briefing.alertRules as Array<{ enabled?: boolean }>) ?? []).filter((r) => r.enabled)
      .length,
    opportunities: opps.map((o) => ({
      symbol: o.symbol,
      title: o.title,
      stance: o.stance,
      confidence: o.confidence,
      probability: o.probability,
      module: o.module,
    })),
  };
}

export async function toolListOpportunities(opts: {
  displayName?: string | null;
  userId: string;
  plan: TerminalPlan | null;
  limit?: number;
}) {
  const briefing = await toolGetBriefing(opts);
  return {
    count: briefing.opportunityCount,
    top: (briefing.opportunities ?? []).slice(0, opts.limit ?? 5),
  };
}

export async function toolAnalyzePortfolio(opts: {
  userId: string;
  module: "trades" | "crypto" | "penny" | "betting" | "predictions";
}) {
  const { userId, module } = opts;
  if (module === "trades" || module === "crypto" || module === "penny") {
    const holdings = await loadPortfolio(userId, module);
    if (!holdings.length) {
      return {
        module,
        empty: true,
        message: `No ${module} holdings yet. Open the desk and add symbols to your ledger first.`,
      };
    }
    const analyzed =
      module === "trades"
        ? await analyzeStockPortfolio(holdings)
        : module === "crypto"
          ? await analyzeCryptoPortfolio(holdings)
          : await analyzePennyPortfolio(holdings);
    return {
      module,
      empty: false,
      summary: analyzed.summary,
      recommendations: analyzed.recs.slice(0, 5).map((r) => ({
        symbol: r.symbol,
        action: r.action,
        confidence: r.confidence,
        headline: r.headline,
      })),
    };
  }
  if (module === "betting") {
    const bets = await listBets(userId);
    const open = bets.filter((b) => !b.outcome || b.outcome === "open");
    if (!open.length) {
      return { module, empty: true, message: "No open bets. Add slips on the Bets desk." };
    }
    const analyzed = await analyzeBets(
      open.map((b) => ({ matchup: b.matchup, pick: b.pick, stake: b.stake }))
    );
    return {
      module,
      empty: false,
      summary: analyzed.summary,
      recommendations: analyzed.recs.slice(0, 5).map((r) => ({
        symbol: r.symbol,
        action: r.action,
        confidence: r.confidence,
        headline: r.headline,
      })),
    };
  }
  const preds = await listPredictions(userId);
  const open = preds.filter((p) => !p.outcome || p.outcome === "open");
  if (!open.length) {
    return {
      module,
      empty: true,
      message: "No open prediction positions. Add them on the Predictions desk.",
    };
  }
  const analyzed = await analyzePredictions(
    open.map((p) => ({ market: p.market, pick: p.pick, stake: p.stake }))
  );
  return {
    module,
    empty: false,
    summary: analyzed.summary,
    recommendations: analyzed.recs.slice(0, 5).map((r) => ({
      symbol: r.symbol,
      action: r.action,
      confidence: r.confidence,
      headline: r.headline,
    })),
  };
}

/** Parallel multi-desk book review — preferred when user says “my whole portfolio”. */
export async function toolScanAllPortfolios(userId: string) {
  const modules = ["trades", "crypto", "penny", "betting", "predictions"] as const;
  const results = await Promise.all(
    modules.map(async (module) => {
      try {
        return await toolAnalyzePortfolio({ userId, module });
      } catch {
        return { module, empty: true, message: `${module} scan unavailable right now.` };
      }
    })
  );
  const withData = results.filter((r) => !("empty" in r && r.empty));
  return {
    desksScanned: modules.length,
    desksWithData: withData.length,
    results,
    note:
      withData.length === 0
        ? "No holdings or open slips found across desks. Guide the user to add ledger items."
        : "Summarize across desks using stance language. Call out empty desks briefly.",
  };
}

export async function toolExplainSymbol(symbol: string) {
  const sym = symbol.toUpperCase().replace(/^\$/, "").trim();
  if (!sym) {
    return { empty: true, message: "Provide a ticker like NVDA or BTC." };
  }

  const [whales, congress] = await Promise.all([
    fetchWhaleAlerts().catch(() => []),
    fetchCongressTrades(12).catch(() => []),
  ]);

  const options = scanUnusualOptions().filter(
    (o) => String(o.symbol ?? "").toUpperCase() === sym
  );
  const penny = scanPennyMovers().filter((p) => String(p.symbol ?? "").toUpperCase() === sym);
  const whaleHits = whales.filter((w) => String(w.asset ?? "").toUpperCase() === sym);
  const congressHits = congress.filter(
    (c) => String((c as { symbol?: string }).symbol ?? "").toUpperCase() === sym
  );

  return {
    symbol: sym,
    empty: !(options.length || penny.length || whaleHits.length || congressHits.length),
    unusualOptions: options.slice(0, 3),
    pennyMovers: penny.slice(0, 2),
    whaleAlerts: whaleHits.slice(0, 2),
    congress: congressHits.slice(0, 2),
    note: "Desk feed lens only — not a forecast. If empty, say no live flags and suggest opening the relevant desk scanner.",
  };
}

export function toolExplainNavigation(topic: string) {
  const key = topic.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, string> = {
    trade: "stocks",
    trades: "stocks",
    stocks: "stocks",
    pink: "penny",
    pink_slips: "penny",
    penny: "penny",
    crypto: "crypto",
    bet: "betting",
    bets: "betting",
    betting: "betting",
    polymarket: "predictions",
    predictions: "predictions",
    home: "home",
    holding: "holdings",
    holdings: "holdings",
    portfolio: "holdings",
    watchlist: "watchlist",
    radar: "watchlist",
    broker: "brokers",
    brokers: "brokers",
    apps: "brokers",
    glossary: "glossary",
  };
  const mapped = aliases[key] ?? key;
  return {
    topic: mapped,
    guide: NAV_GUIDE[mapped] ?? NAV_GUIDE.home,
    tip: "Use Ask AI (Chief of Finance) anytime — or the left sidebar / bottom nav to jump desks.",
  };
}

export function resolveNavigateTab(tab: string): AskNavigateTab | null {
  const t = tab.toLowerCase().trim();
  const map: Record<string, AskNavigateTab> = {
    home: "home",
    stocks: "stocks",
    trades: "stocks",
    penny: "penny",
    pinkslips: "penny",
    "pink-slips": "penny",
    crypto: "crypto",
    betting: "betting",
    bets: "betting",
    predictions: "predictions",
    polymarket: "predictions",
  };
  return map[t] ?? null;
}

export function tabAwareHint(tab?: string): string {
  switch ((tab ?? "").toLowerCase()) {
    case "stocks":
      return "User is on Trades — lean toward options flow, holdings analysis, and stance language for equities.";
    case "penny":
      return "User is on Pink Slips — emphasize microcap volatility, volume spikes, and elevated risk framing.";
    case "crypto":
      return "User is on Crypto — lean toward whale/on-chain context and crypto ledger stances.";
    case "betting":
      return "User is on Bets — explain live odds context; never recommend a wager.";
    case "predictions":
      return "User is on Predictions — explain event-market odds; crowd consensus ≠ forecast.";
    case "home":
      return "User is on Home — Daily Brief and Opportunity Radar are the best starting points.";
    default:
      return "Orient the user gently if they seem lost — offer a desk map.";
  }
}

export function suggestFollowUps(usedTools: string[], tab?: string, symbol?: string): string[] {
  const tips: string[] = [];
  if (usedTools.includes("list_opportunities") || usedTools.includes("get_briefing")) {
    tips.push("Scan my whole portfolio");
    tips.push(symbol ? `Explain ${symbol}` : "Explain the top signal");
  }
  if (usedTools.includes("analyze_portfolio") || usedTools.includes("scan_all_portfolios")) {
    tips.push("What are today's top opportunities?");
    tips.push("Where do I add holdings?");
  }
  if (usedTools.includes("explain_symbol")) {
    tips.push("Analyze my portfolio");
    tips.push("Go to Home");
  }
  if (usedTools.includes("explain_navigation") || usedTools.includes("navigate_desk")) {
    tips.push("What are today's top opportunities?");
    tips.push("Analyze my portfolio");
  }
  if (!tips.length) {
    tips.push("What are today's top opportunities?", "Scan my whole portfolio", "Explain this desk");
  }
  if (tab === "crypto") tips.push("Any whale alerts today?");
  return [...new Set(tips)].slice(0, 3);
}
