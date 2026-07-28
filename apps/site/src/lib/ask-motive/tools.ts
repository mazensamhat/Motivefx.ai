import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import {
  analyzeStockPortfolio,
  analyzeCryptoPortfolio,
  analyzePennyPortfolio,
  analyzeBets,
  analyzePredictions,
} from "@/lib/terminal/advisor-engine";
import { loadPortfolio } from "@/lib/terminal/portfolio";
import { listBets } from "@/lib/terminal/bets";
import { listPredictions } from "@/lib/terminal/predictions";
import type { TerminalPlan } from "@/lib/terminal/plan";

export type AskNavigateTab =
  | "home"
  | "stocks"
  | "penny"
  | "crypto"
  | "betting"
  | "predictions";

export type AskAction = { type: "navigate"; tab: AskNavigateTab };

const NAV_GUIDE: Record<string, string> = {
  home: "Home shows your daily briefing, Today's Signals, radar, and module pulse. Open it from the left sidebar or bottom nav.",
  stocks:
    "Trades desk: add stock holdings, run AI Analyze for Motive Signal stances, and review unusual options / congress flow.",
  penny:
    "Pink Slips desk: track sub-$5 names, volume spikes, and microcap context. Higher volatility — informational only.",
  crypto:
    "Crypto desk: ledger units, whale alerts, and on-chain context. Use AI Analyze for stance labels on your holdings.",
  betting:
    "Bets desk: open slips, live odds context, and grader notes. Informational odds context — not a wager recommendation.",
  predictions:
    "Predictions desk: Polymarket-style event markets and your positions. Stances reflect crowd odds context.",
  holdings:
    "Add holdings on each market desk (Trades / Pink Slips / Crypto) via the portfolio / ledger panel. That unlocks personalized radar hits on Home.",
  watchlist:
    "Star symbols on your radar / watchlist so Home can highlight signals that match what you track.",
  brokers:
    "Apps & brokers: open from Account or the Apps button in the header. Pick where you trade so confirm actions can deep-link out. Skip anytime.",
  glossary:
    "Signal Glossary explains Motive Signal terms. Open it from the Home briefing actions or the sidebar glossary control.",
};

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
    topAiTip: briefing.topAiTip,
    coverageLine: (briefing.personalized as { coverageLine?: string } | undefined)?.coverageLine,
    opportunities: opps.map((o) => ({
      symbol: o.symbol,
      title: o.title,
      stance: o.stance,
      confidence: o.confidence,
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
    tip: "Use the floating Chief of Finance anytime — or the left sidebar / bottom nav to jump desks.",
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
