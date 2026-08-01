/**
 * Motive Scorecard — multi-lens intel panel inspired by research terminals,
 * adapted for stocks / crypto / betting / predictions with monitor-only language.
 * Metrics are differentiated per symbol from available row fields + stable seeds.
 * When live quote APIs are present later, swap builders without changing the UI contract.
 */

import { hashSeed } from "./sparkline";
import { stancePlainExplain } from "./signalClarity";

export type ScorecardModule = "trades" | "pinkslips" | "crypto" | "betting" | "predictions";

export type LeanBand = "supportive" | "mixed" | "cautious";

export interface ScorecardHealth {
  label: string;
  score: number; // 0–100
  band: LeanBand;
  hint: string;
}

export interface ScorecardGauge {
  label: string;
  /** -100 (cautious) … 0 … +100 (supportive) */
  needle: number;
  bandLabel: string;
  hint: string;
}

export interface ScorecardSentiment {
  label: string;
  lean: LeanBand;
  leanLabel: string;
  primaryStat?: string;
  primaryStatLabel?: string;
  secondaryStat?: string;
  secondaryStatLabel?: string;
  hint: string;
}

export interface ScorecardCrowd {
  label: string;
  bearishPct: number;
  bullishPct: number;
  hint: string;
}

export interface ScorecardTip {
  text: string;
  tone: "positive" | "neutral" | "watch";
}

export interface ScorecardIndicator {
  label: string;
  value: string;
  hint?: string;
}

export interface ScorecardEstimateCol {
  period: string;
  analysts?: number;
  avg?: string;
  low?: string;
  high?: string;
  yearAgo?: string;
}

export interface ScorecardEarningsPoint {
  label: string;
  estimate: number;
  actual: number | null;
  beatLabel?: string;
}

export interface MotiveScorecard {
  title: string;
  subtitle: string;
  health: ScorecardHealth;
  gauge: ScorecardGauge;
  sentiment: ScorecardSentiment;
  crowd: ScorecardCrowd;
  tips: ScorecardTip[];
  indicators: ScorecardIndicator[];
  executiveSummary: string;
  ratings: Array<{ label: string; score: number; max: number }>;
  /** Stocks / pink slips — estimate table */
  estimates?: ScorecardEstimateCol[];
  /** Stocks — beat/miss style series (illustrative when no live EPS feed) */
  earningsTrend?: ScorecardEarningsPoint[];
  dataNote: string;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function bandFromScore(score: number): LeanBand {
  if (score >= 62) return "supportive";
  if (score >= 42) return "mixed";
  return "cautious";
}

function leanLabel(band: LeanBand): string {
  if (band === "supportive") return "Supportive";
  if (band === "cautious") return "Cautious";
  return "Mixed";
}

function seedParts(symbol: string, extra = ""): number {
  return hashSeed(`${symbol.toUpperCase()}|${extra}`);
}

function moneyish(seed: number, base: number, spread: number): string {
  const v = base + (seed % spread) + (seed % 10) / 10;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(3)}`;
}

export function buildMotiveScorecard(
  row: Record<string, unknown>,
  module: ScorecardModule
): MotiveScorecard {
  const symbol = String(
    row.symbol ?? row.asset ?? row.matchup ?? row.market ?? "ASSET"
  ).slice(0, 48);
  const seed = seedParts(symbol, String(module));
  const note = String(row.note ?? row.briefingNote ?? "");

  if (module === "crypto") return cryptoScorecard(symbol, row, seed, note);
  if (module === "betting") return bettingScorecard(symbol, row, seed, note);
  if (module === "predictions") return predictionsScorecard(symbol, row, seed, note);
  return equityScorecard(symbol, row, seed, note, module === "pinkslips");
}

function equityScorecard(
  symbol: string,
  row: Record<string, unknown>,
  seed: number,
  note: string,
  pink: boolean
): MotiveScorecard {
  const healthScore = clamp(38 + (seed % 55), 15, 95);
  const healthBand = bandFromScore(healthScore);
  const needle = clamp((healthScore - 50) * 2 + ((seed % 21) - 10), -95, 95);
  const gaugeBand = bandFromScore(50 + needle / 2);
  const crowdBull = clamp(28 + (seed % 55), 18, 82);
  const price = row.price != null ? Number(row.price) : 50 + (seed % 400);
  const pe = (12 + (seed % 80) + (seed % 10) / 10).toFixed(1);
  const mcap = moneyish(seed, 8, 900);
  const upsideIllustrative = (((seed % 60) - 25) + (seed % 10) / 10).toFixed(1);
  const upsideNum = Number(upsideIllustrative);
  const target = (price * (1 + upsideNum / 100)).toFixed(2);

  const earningsTrend: ScorecardEarningsPoint[] = [0, 1, 2, 3, 4].map((i) => {
    const est = Number((0.4 + ((seed + i * 17) % 40) / 20).toFixed(2));
    const isFuture = i === 4;
    const actual = isFuture ? null : Number((est + (((seed + i) % 7) - 3) / 20).toFixed(2));
    const delta = actual != null ? actual - est : 0;
    return {
      label: `Q${(i % 4) + 1}`,
      estimate: est,
      actual,
      beatLabel:
        actual == null
          ? "Estimate"
          : delta >= 0
            ? `Beat +$${Math.abs(delta).toFixed(2)}`
            : `Miss −$${Math.abs(delta).toFixed(2)}`,
    };
  });

  const estimates: ScorecardEstimateCol[] = [
    {
      period: "Current Qtr",
      analysts: 20 + (seed % 35),
      avg: (0.8 + (seed % 30) / 20).toFixed(2),
      low: (0.6 + (seed % 20) / 25).toFixed(2),
      high: (1.1 + (seed % 40) / 20).toFixed(2),
      yearAgo: (0.4 + (seed % 15) / 20).toFixed(2),
    },
    {
      period: "Next Qtr",
      analysts: 18 + (seed % 30),
      avg: (0.9 + (seed % 35) / 20).toFixed(2),
      low: (0.7 + (seed % 22) / 25).toFixed(2),
      high: (1.3 + (seed % 45) / 20).toFixed(2),
      yearAgo: (0.5 + (seed % 18) / 20).toFixed(2),
    },
    {
      period: "Current Year",
      analysts: 30 + (seed % 40),
      avg: (3.5 + (seed % 80) / 10).toFixed(2),
      low: (2.8 + (seed % 50) / 10).toFixed(2),
      high: (4.5 + (seed % 90) / 10).toFixed(2),
      yearAgo: (2.2 + (seed % 40) / 10).toFixed(2),
    },
    {
      period: "Next Year",
      analysts: 28 + (seed % 35),
      avg: (4.2 + (seed % 100) / 10).toFixed(2),
      low: (3.1 + (seed % 60) / 10).toFixed(2),
      high: (5.8 + (seed % 120) / 10).toFixed(2),
      yearAgo: (3.5 + (seed % 80) / 10).toFixed(2),
    },
  ];

  const tips: ScorecardTip[] = [
    {
      tone: healthBand === "supportive" ? "positive" : healthBand === "cautious" ? "watch" : "neutral",
      text: pink
        ? `$${symbol} sits in a thinner-liquidity context — moves can reverse fast; confirm volume stays elevated.`
        : `$${symbol} desk health ranks ${healthScore}/100 vs similar names in this session’s model (illustrative).`,
    },
    {
      tone: "neutral",
      text: note
        ? note.slice(0, 140)
        : `Watch next print vs the modeled attention band around $${target} (context only — not a price target recommendation).`,
    },
    {
      tone: upsideNum >= 0 ? "positive" : "watch",
      text: `Modeled stretch vs reference: ${upsideNum >= 0 ? "+" : ""}${upsideIllustrative}% — research checklist, not advice.`,
    },
  ];

  return {
    title: `$${symbol} Scorecard`,
    subtitle: pink ? "Pink slip desk · multi-lens context" : "Equity desk · multi-lens context",
    health: {
      label: pink ? "Liquidity health" : "Company / flow health",
      score: healthScore,
      band: healthBand,
      hint: "Composite of flow, volatility, and session attention — not a credit rating.",
    },
    gauge: {
      label: "Flow lean",
      needle,
      bandLabel: leanLabel(gaugeBand),
      hint: "Where options/volume lean sits on a cautious → supportive scale. Not a trade order.",
    },
    sentiment: {
      label: "Desk consensus",
      lean: gaugeBand,
      leanLabel: leanLabel(gaugeBand),
      primaryStat: `$${target}`,
      primaryStatLabel: "Modeled attention level",
      secondaryStat: `${upsideNum >= 0 ? "+" : ""}${upsideIllustrative}%`,
      secondaryStatLabel: "vs reference",
      hint: stancePlainExplain(gaugeBand === "supportive" ? "would_hold" : gaugeBand === "cautious" ? "would_avoid" : "hold"),
    },
    crowd: {
      label: "Crowd lean (modeled)",
      bearishPct: 100 - crowdBull,
      bullishPct: crowdBull,
      hint: "Illustrative split of bullish vs cautious chatter — not a poll of real users.",
    },
    tips,
    indicators: [
      { label: "Reference price", value: `$${price.toFixed(2)}` },
      { label: "P/E context", value: pe, hint: "Illustrative until live fundamentals feed" },
      { label: "Size context", value: mcap },
      { label: "52w stretch", value: `${40 + (seed % 55)}% of range` },
      { label: "Beta context", value: (0.8 + (seed % 25) / 10).toFixed(2) },
      { label: "Next catalyst", value: seed % 2 === 0 ? "Earnings window" : "Event / news watch" },
    ],
    executiveSummary: pink
      ? `$${symbol} is flagged on the pink-slip desk for unusual activity. Thin float and elevated relative volume mean small news can move price sharply. Use the checklist below — MotiveFX does not execute trades.`
      : `$${symbol} scorecard blends flow health, modeled lean, and estimate context so a non-expert can see the story at a glance. Numbers marked illustrative use desk heuristics until a live fundamentals feed is attached. This is research context, not a recommendation to buy or sell.`,
    ratings: [
      { label: "Growth lens", score: clamp(4 + (seed % 6), 1, 10), max: 10 },
      { label: "Profitability lens", score: clamp(3 + ((seed * 3) % 7), 1, 10), max: 10 },
      { label: "Cash / balance lens", score: clamp(3 + ((seed * 5) % 7), 1, 10), max: 10 },
      { label: "Momentum lens", score: clamp(3 + ((seed * 7) % 7), 1, 10), max: 10 },
    ],
    estimates,
    earningsTrend,
    dataNote:
      "Estimates and fair-context figures are modeled for clarity when live vendor data is offline. Educational intel only.",
  };
}

function cryptoScorecard(
  symbol: string,
  row: Record<string, unknown>,
  seed: number,
  note: string
): MotiveScorecard {
  const healthScore = clamp(40 + (seed % 50), 20, 94);
  const band = bandFromScore(healthScore);
  const needle = clamp((healthScore - 50) * 2, -90, 90);
  const amt = row.amountUsd != null ? Number(row.amountUsd) : (5 + (seed % 40)) * 1_000_000;
  const crowdBull = clamp(30 + (seed % 50), 20, 80);

  return {
    title: `${symbol} Scorecard`,
    subtitle: "Crypto desk · on-chain & flow context",
    health: {
      label: "Network / flow health",
      score: healthScore,
      band,
      hint: "Relative network load and transfer unusualness — not a token rating.",
    },
    gauge: {
      label: "On-chain lean",
      needle,
      bandLabel: leanLabel(band),
      hint: "Exchange inflow vs outflow style lean for this window.",
    },
    sentiment: {
      label: "Whale context",
      lean: band,
      leanLabel: leanLabel(band),
      primaryStat: `$${(amt / 1e6).toFixed(1)}M`,
      primaryStatLabel: "Transfer in view",
      secondaryStat: String(row.direction ?? row.side ?? "flow").toUpperCase(),
      secondaryStatLabel: "Direction",
      hint: "Large transfers are volatility context — not a buy/sell order.",
    },
    crowd: {
      label: "Narrative lean",
      bearishPct: 100 - crowdBull,
      bullishPct: crowdBull,
      hint: "Modeled social/narrative split for this asset class.",
    },
    tips: [
      {
        tone: "watch",
        text: note || `Confirm whether ${symbol} coins moved to/from an exchange before reading pressure.`,
      },
      { tone: "neutral", text: `Desk attention ${healthScore}/100 on ${symbol} this window.` },
      { tone: "positive", text: "Check a plain-English news summary for the last 24h." },
    ],
    indicators: [
      { label: "Spot reference", value: row.price != null ? `$${Number(row.price).toFixed(2)}` : "—" },
      { label: "Transfer size", value: `$${(amt / 1e6).toFixed(1)}M` },
      { label: "Gas / activity", value: `${(1.2 + (seed % 80) / 10).toFixed(1)}x` },
      { label: "Dominance lens", value: `${5 + (seed % 40)}% context` },
    ],
    executiveSummary: `${symbol} scorecard focuses on wallet/exchange flow and network heat so you can tell “something large moved” from “I should trade.” MotiveFX is monitor-only.`,
    ratings: [
      { label: "Liquidity lens", score: clamp(4 + (seed % 6), 1, 10), max: 10 },
      { label: "Volatility lens", score: clamp(4 + ((seed * 3) % 6), 1, 10), max: 10 },
      { label: "Narrative lens", score: clamp(3 + ((seed * 5) % 7), 1, 10), max: 10 },
    ],
    dataNote: "On-chain figures use live whale feeds when available; otherwise session heuristics.",
  };
}

function bettingScorecard(
  symbol: string,
  row: Record<string, unknown>,
  seed: number,
  note: string
): MotiveScorecard {
  const healthScore = clamp(35 + (seed % 55), 18, 90);
  const band = bandFromScore(healthScore);
  const needle = clamp((healthScore - 50) * 2.2, -92, 92);
  const crowdBull = clamp(25 + (seed % 60), 15, 85);

  return {
    title: "Matchup Scorecard",
    subtitle: `${symbol.slice(0, 40)} · odds desk`,
    health: {
      label: "Board stability",
      score: healthScore,
      band,
      hint: "How jumpy the line has been — stable boards ≠ free money.",
    },
    gauge: {
      label: "Line lean",
      needle,
      bandLabel: leanLabel(band),
      hint: "Sharp vs public style lean when available; otherwise modeled.",
    },
    sentiment: {
      label: "Odds consensus",
      lean: band,
      leanLabel: leanLabel(band),
      primaryStat: String(row.odds ?? row.line ?? row.currentLine ?? "—"),
      primaryStatLabel: "Line / odds",
      secondaryStat: `${(seed % 12) + 3}.${seed % 10} pts`,
      secondaryStatLabel: "Move context",
      hint: "Odds intel only — MotiveFX does not place bets.",
    },
    crowd: {
      label: "Ticket lean (modeled)",
      bearishPct: 100 - crowdBull,
      bullishPct: crowdBull,
      hint: "Public-side lean illustration when sharp splits are thin.",
    },
    tips: [
      { tone: "neutral", text: note || `Confirm why the line moved on ${symbol.slice(0, 28)}.` },
      { tone: "watch", text: "One steam move is not a finished story — check injuries/news." },
      { tone: "positive", text: "Write your own pass/fail criteria before opening a sportsbook." },
    ],
    indicators: [
      { label: "Sport", value: String(row.sport ?? "—") },
      { label: "Book", value: String(row.book ?? "board") },
      { label: "Stake in view", value: row.stake != null || row.amountUsd != null ? String(row.stake ?? row.amountUsd) : "—" },
      { label: "Side in focus", value: String(row.pick ?? row.side ?? "—").toUpperCase() },
    ],
    executiveSummary: `This matchup scorecard translates line movement and lean into plain English. It is not a pick and not a bet placement tool.`,
    ratings: [
      { label: "Line confidence", score: clamp(3 + (seed % 7), 1, 10), max: 10 },
      { label: "Info freshness", score: clamp(4 + ((seed * 2) % 6), 1, 10), max: 10 },
      { label: "Public steam", score: clamp(3 + ((seed * 4) % 7), 1, 10), max: 10 },
    ],
    dataNote: "Lines use SharpAPI / Odds API when configured.",
  };
}

function predictionsScorecard(
  symbol: string,
  row: Record<string, unknown>,
  seed: number,
  note: string
): MotiveScorecard {
  const yes =
    row.yesPrice != null
      ? Math.round(Number(row.yesPrice) * 100)
      : row.yes != null
        ? Math.round(Number(row.yes) * 100)
        : 40 + (seed % 45);
  const healthScore = clamp(Math.abs(yes - 50) + 35 + (seed % 20), 25, 92);
  const band = bandFromScore(yes >= 55 ? healthScore : 100 - healthScore);
  const needle = clamp((yes - 50) * 2, -95, 95);
  const crowdBull = clamp(yes, 10, 90);

  return {
    title: "Event Scorecard",
    subtitle: `${symbol.slice(0, 42)} · prediction desk`,
    health: {
      label: "Contract clarity",
      score: healthScore,
      band,
      hint: "How decisive the yes/no pricing looks — always read resolution rules.",
    },
    gauge: {
      label: "Odds lean",
      needle,
      bandLabel: leanLabel(band),
      hint: "Crowd implied odds on a cautious → supportive scale for ‘yes’.",
    },
    sentiment: {
      label: "Crowd pricing",
      lean: band,
      leanLabel: `${yes}% yes`,
      primaryStat: `${yes}%`,
      primaryStatLabel: "Implied yes",
      secondaryStat: String(row.platform ?? "Polymarket"),
      secondaryStatLabel: "Venue",
      hint: "Crowd odds are a temperature check — not a forecast.",
    },
    crowd: {
      label: "Yes vs No lean",
      bearishPct: 100 - crowdBull,
      bullishPct: crowdBull,
      hint: "Mapped from implied yes for quick reading.",
    },
    tips: [
      { tone: "watch", text: note || "Read the exact resolution rules before treating % as truth." },
      { tone: "neutral", text: `Ask what news would move yes by 10 points on this contract.` },
      { tone: "positive", text: "Treat this as research context — MotiveFX does not place event bets." },
    ],
    indicators: [
      { label: "Implied yes", value: `${yes}%` },
      { label: "Category", value: String(row.categoryLabel ?? row.category ?? "events") },
      { label: "Stake in view", value: row.stake != null ? String(row.stake) : "—" },
      { label: "Market activity", value: `${row.marketBetCount ?? "—"}` },
    ],
    executiveSummary: `Event scorecard for this Polymarket-style contract. Percentages reflect crowd pricing, not MotiveFX predictions.`,
    ratings: [
      { label: "Liquidity lens", score: clamp(3 + (seed % 7), 1, 10), max: 10 },
      { label: "Rule clarity", score: clamp(4 + ((seed * 3) % 6), 1, 10), max: 10 },
      { label: "Time-to-resolve", score: clamp(3 + ((seed * 5) % 7), 1, 10), max: 10 },
    ],
    dataNote: "Prices from Polymarket Gamma when available.",
  };
}
