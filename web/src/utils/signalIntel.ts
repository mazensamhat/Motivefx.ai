import { SIGNAL_GLOSSARY, type GlossaryEntry } from "../config/signalGlossary";
import { beginnerNextSteps } from "./signalClarity";

export interface RelatedWatchItem {
  symbol: string;
  desk: string;
  stanceLabel: string;
  attention: number;
  blurb: string;
  deepDiveModule: "trades" | "pinkslips" | "crypto" | "betting" | "predictions";
  deepDiveRow: Record<string, unknown>;
}

export interface SignalDetailPayload {
  title: string;
  category: string;
  definition: string;
  example?: string;
  contextLines?: string[];
  /** Plain-language research checklist for beginners — not trade instructions */
  nextSteps?: string[];
  /** Related tickers/markets to watch — open full scorecard from Signal Intel */
  relatedWatches?: RelatedWatchItem[];
  symbol?: string;
  confidence?: number;
  journalNote?: string;
  journalMeta?: { module?: string; symbol?: string; signalTitle?: string };
  /** When set, Signal Intel shows “Open full scorecard” → Asset Deep Dive */
  deepDiveModule?: "trades" | "pinkslips" | "crypto" | "betting" | "predictions";
  deepDiveRow?: Record<string, unknown>;
}

const ALIAS_TO_GLOSSARY: Record<string, string> = {
  "options flow": "unusual-options",
  "unusual options flow": "unusual-options",
  "unusual volume": "volume-spike",
  "volume spike": "volume-spike",
  "microcap scanner": "volume-spike",
  "ai lens": "scenario",
  "ai rating": "scenario",
  "whale transfer": "whale-alert",
  "whale alert": "whale-alert",
  "whale flow": "whale-alert",
  "on-chain": "whale-alert",
  "sharp money": "sharp-money",
  "line movement": "line-move",
  "public split": "sharp-money",
  "event market": "event-market",
  "24h volume": "volume-spike",
  "block flow": "unusual-options",
  "call bias": "unusual-options",
  "put hedge": "unusual-options",
  "premium spike": "unusual-options",
  "open interest shift": "unusual-options",
  "congress cross-check": "congress-flow",
  "volume breakout": "volume-spike",
  "thin liquidity flag": "volume-spike",
  "catalyst watch": "volume-spike",
  "exchange outflow": "whale-alert",
  "exchange inflow": "whale-alert",
  "wallet cluster": "whale-alert",
  "steam move": "line-move",
  "odds swing": "event-market",
  "crowd consensus": "event-market",
  "pink slip flow": "volume-spike",
  "bet slip": "sharp-money",
  "motivfx score": "motivfx-score",
  "motivefx score": "motivfx-score",
  "radar hit": "radar-hit",
  "modeled scenario": "scenario",
  "congress flow": "congress-flow",
  "insider flow": "congress-flow",
  "volume breakout signal": "volume-spike",
  "bullish flow signal": "unusual-options",
  "defensive flow signal": "unusual-options",
  "whale transfer signal": "whale-alert",
  "sharp money signal": "sharp-money",
  "event market signal": "event-market",
};

const RISK_DEFINITIONS: Record<string, SignalDetailPayload> = {
  low: {
    title: "Low risk flag",
    category: "Risk lens",
    definition:
      "Signal confidence and volatility context suggest lower relative uncertainty. Still informational only — not a safety guarantee.",
  },
  medium: {
    title: "Medium risk flag",
    category: "Risk lens",
    definition:
      "Mixed or moderate uncertainty in the underlying data. Worth extra verification before acting on the intel.",
  },
  high: {
    title: "High risk flag",
    category: "Risk lens",
    definition:
      "Elevated volatility, thin liquidity, or conflicting data sources. Common on pink slips and event-driven names.",
  },
  extreme: {
    title: "Extreme risk flag",
    category: "Risk lens",
    definition:
      "Maximum caution tier — thin names, binary events, or low-confidence cross-checks. Treat as awareness, not direction.",
  },
};

const LIVE_TYPE_SIGNAL: Record<string, string> = {
  crypto: "Whale Alert",
  stock: "Options Flow",
  betting: "Line Movement",
  penny: "Volume Spike",
  predictions: "Event Market",
};

function normalize(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function findGlossary(label: string): GlossaryEntry | undefined {
  const key = normalize(label);
  const id = ALIAS_TO_GLOSSARY[key];
  if (id) return SIGNAL_GLOSSARY.find((g) => g.id === id);

  return SIGNAL_GLOSSARY.find(
    (g) =>
      normalize(g.term) === key ||
      normalize(g.term).includes(key) ||
      key.includes(normalize(g.term))
  );
}

export function resolveSignalDetail(
  label: string,
  extra?: Partial<SignalDetailPayload>
): SignalDetailPayload {
  const entry = findGlossary(label);
  const symbol = extra?.symbol;
  const category = extra?.category ?? entry?.category ?? "Signal";
  const nextSteps = extra?.nextSteps ?? beginnerNextSteps(symbol, category);

  if (entry) {
    return {
      title: entry.term,
      definition: entry.definition,
      example: entry.example,
      ...extra,
      category: extra?.category ?? entry.category,
      contextLines: extra?.contextLines,
      nextSteps,
      symbol,
    };
  }

  return {
    title: label,
    category,
    definition:
      extra?.definition ??
      `${label} is a live intel tag from MotiveFX desks. Cross-reference with the Why? panel and your own research — informational context only.`,
    ...extra,
    nextSteps,
    symbol,
  };
}

export function resolveRiskDetail(level: string, context?: string): SignalDetailPayload {
  const base = RISK_DEFINITIONS[level.toLowerCase()] ?? RISK_DEFINITIONS.medium;
  return {
    ...base,
    contextLines: context ? [context] : undefined,
  };
}

export function liveEventToSignalDetail(type: string, message: string): SignalDetailPayload {
  const signalLabel = LIVE_TYPE_SIGNAL[type] ?? "Signal";
  return resolveSignalDetail(signalLabel, {
    category: "Live feed",
    contextLines: [message],
  });
}

export function moverToSignalDetail(m: {
  symbol: string;
  changePct?: number;
  volRatio?: number;
  note?: string;
  price?: number;
}): SignalDetailPayload {
  return resolveSignalDetail("Volume Spike", {
    symbol: m.symbol,
    category: "Pink Slips",
    contextLines: [
      `$${m.symbol} at $${m.price?.toFixed(2) ?? "—"} · ${m.changePct != null ? `${m.changePct >= 0 ? "+" : ""}${m.changePct}% session` : "session move"}.`,
      m.volRatio != null ? `Volume ${m.volRatio}x recent average.` : "",
      m.note ?? "",
    ].filter(Boolean),
    deepDiveModule: "pinkslips",
    deepDiveRow: {
      symbol: m.symbol,
      price: m.price,
      changePct: m.changePct,
      volRatio: m.volRatio,
      note: m.note,
      side: (m.changePct ?? 0) >= 0 ? "buy" : "sell",
      timestamp: new Date().toISOString(),
    },
  });
}

export function compareLensDetail(item: {
  symbol: string;
  title: string;
  currentConfidence: number;
  priorConfidence: number;
  context: string;
}): SignalDetailPayload {
  return resolveSignalDetail("Modeled Scenario", {
    symbol: item.symbol,
    confidence: item.currentConfidence,
    category: "Compare lens",
    contextLines: [
      item.title,
      `Now: ${item.currentConfidence}% vs 7-day similar setups: ${item.priorConfidence}%.`,
      item.context,
    ],
  });
}

export function optionFlowDetail(o: {
  symbol: string;
  type: string;
  strike?: number;
  volume?: number;
  premium?: number;
  note?: string;
  volOiRatio?: number;
}): SignalDetailPayload {
  return resolveSignalDetail("Unusual Options Flow", {
    symbol: o.symbol,
    category: "Trades",
    contextLines: [
      `${o.type.toUpperCase()} · strike $${o.strike ?? "—"}`,
      o.volume != null ? `Volume ${o.volume.toLocaleString()}` : "",
      o.premium != null ? `Premium ~$${o.premium.toLocaleString()}` : "",
      o.note ?? "",
    ].filter(Boolean),
    deepDiveModule: "trades",
    deepDiveRow: {
      symbol: o.symbol,
      type: o.type,
      side: o.type === "put" ? "sell" : "buy",
      premium: o.premium,
      note: o.note ?? `Vol/OI ${(o.volOiRatio ?? 0) || "—"}x · strike $${o.strike ?? "—"}`,
      volOiRatio: o.volOiRatio,
      timestamp: new Date().toISOString(),
      id: `opt-${o.symbol}-${o.type}-${o.strike ?? ""}`,
    },
  });
}

export function congressFlowDetail(t: {
  politician: string;
  symbol: string;
  transaction: string;
  amount: string;
  filedAt?: string;
}): SignalDetailPayload {
  const isSale = String(t.transaction).toLowerCase().includes("sale");
  return resolveSignalDetail("Congress / Insider Flow", {
    symbol: t.symbol,
    category: "Trades",
    contextLines: [
      `${t.politician} · ${t.transaction} ${t.symbol}`,
      `Disclosed amount: ${t.amount}`,
      t.filedAt ? `Filed ${t.filedAt}` : "",
    ].filter(Boolean),
    deepDiveModule: "trades",
    deepDiveRow: {
      symbol: t.symbol,
      side: isSale ? "sell" : "buy",
      actorType: "institutional",
      note: `${t.politician} · ${t.transaction} · ${t.amount}`,
      briefingNote: `Congress disclosure on $${t.symbol}: ${t.transaction} ${t.amount}.`,
      timestamp: t.filedAt ?? new Date().toISOString(),
      id: `congress-${t.symbol}-${t.politician}`,
    },
  });
}

export function whaleAlertDetail(w: {
  asset: string;
  amountUsd: number;
  direction: string;
  note?: string;
}): SignalDetailPayload {
  const amt =
    w.amountUsd >= 1_000_000
      ? `$${(w.amountUsd / 1_000_000).toFixed(1)}M`
      : w.amountUsd >= 1_000
        ? `$${(w.amountUsd / 1_000).toFixed(0)}K`
        : `$${w.amountUsd.toLocaleString()}`;

  return resolveSignalDetail("Whale Alert", {
    symbol: w.asset,
    category: "Crypto",
    contextLines: [`${amt} ${w.direction}`, w.note ?? ""].filter(Boolean),
    deepDiveModule: "crypto",
    deepDiveRow: {
      symbol: w.asset,
      asset: w.asset,
      amountUsd: w.amountUsd,
      direction: w.direction,
      side: w.direction,
      note: w.note,
      timestamp: new Date().toISOString(),
      id: `whale-${w.asset}-${w.amountUsd}`,
    },
  });
}

export function lineMoveDetail(l: {
  matchup: string;
  sport: string;
  book?: string;
  openingLine?: string;
  currentLine?: string;
}): SignalDetailPayload {
  return resolveSignalDetail("Line Movement", {
    symbol: l.matchup.slice(0, 32),
    category: "Betting",
    contextLines: [
      l.matchup,
      `${l.sport}${l.book ? ` · ${l.book}` : ""}`,
      `Line: ${l.openingLine ?? "—"} → ${l.currentLine ?? "—"}`,
    ],
    deepDiveModule: "betting",
    deepDiveRow: {
      matchup: l.matchup,
      market: l.matchup,
      symbol: l.matchup,
      sport: l.sport,
      book: l.book,
      line: l.currentLine ?? l.openingLine,
      odds: l.currentLine ?? l.openingLine,
      note: `${l.sport} · ${l.openingLine ?? "—"} → ${l.currentLine ?? "—"}`,
      timestamp: new Date().toISOString(),
      id: `line-${l.matchup}`,
    },
  });
}

export function sharpMoneyDetail(s: {
  matchup: string;
  sharpSide: string;
  signal: string;
  publicPct?: number;
  moneyPct?: number;
}): SignalDetailPayload {
  return resolveSignalDetail("Derived Sharp Lean", {
    symbol: s.matchup.slice(0, 32),
    category: "Betting",
    contextLines: [
      s.matchup,
      `Lean side: ${s.sharpSide}`,
      `Signal: ${s.signal.replace(/_/g, " ")}`,
      s.publicPct != null ? `Consensus favorite share ~${s.publicPct}%` : "",
      "Derived from moneyline consensus — not true public/sharp ticket splits.",
    ].filter(Boolean),
    deepDiveModule: "betting",
    deepDiveRow: {
      matchup: s.matchup,
      market: s.matchup,
      symbol: s.matchup,
      pick: s.sharpSide,
      side: s.sharpSide,
      note: `Lean ${s.sharpSide} · ${s.signal.replace(/_/g, " ")}`,
      timestamp: new Date().toISOString(),
      id: `sharp-${s.matchup}`,
    },
  });
}

export function eventMarketDetail(m: {
  market: string;
  yes: number;
  volume24h?: string | number;
  platform?: string;
  categoryLabel?: string;
  category?: string;
}): SignalDetailPayload {
  return resolveSignalDetail("Event Market", {
    symbol: m.market.slice(0, 32),
    category: "Predictions",
    contextLines: [
      m.market,
      `Implied yes: ${(m.yes * 100).toFixed(0)}%`,
      m.volume24h != null ? `24h volume: ${m.volume24h}` : "",
    ].filter(Boolean),
    deepDiveModule: "predictions",
    deepDiveRow: {
      market: m.market,
      symbol: m.market,
      yes: m.yes,
      yesPrice: m.yes,
      platform: m.platform,
      categoryLabel: m.categoryLabel ?? m.category,
      note: `Implied yes ${(m.yes * 100).toFixed(0)}%`,
      timestamp: new Date().toISOString(),
      id: `pred-${m.market.slice(0, 24)}`,
    },
  });
}

export function sentimentDetail(label: string, value: string): SignalDetailPayload {
  const tone =
    value === "bullish"
      ? "More positive mentions and momentum language than bearish cues."
      : value === "bearish"
        ? "More cautionary or negative tone in recent posts and headlines."
        : "Mixed or balanced tone — no strong directional skew in social data.";

  return {
    title: `${label} sentiment`,
    category: "Community",
    definition: `Aggregate social and news tone scraped from ${label}. Used as context alongside desk signals — not a trade or bet recommendation.`,
    contextLines: [`Current reading: ${value}`, tone],
  };
}

export function homeScoreDetail(score: number, marketConfidence: string, stars: number): SignalDetailPayload {
  return resolveSignalDetail("MotiveFX Score", {
    category: "Home",
    contextLines: [
      `Desk attention: ${score}/100 · ${stars} of 5 stars`,
      `Feed density: ${marketConfidence}`,
      "Higher scores mean more cross-desk activity is flagged right now — not that markets will rise.",
    ],
  });
}

export function themeSignalDetail(input: {
  theme: string;
  status?: string;
  direction?: string;
  probability?: number;
  confidence?: number;
  timing?: string;
  beneficiaries?: string[];
  supportingFactors?: string[];
  relatedSymbols?: string[];
  deltaVsPrior?: number;
  /** Optional desk opportunities for related watches */
  opportunities?: import("../types").HomeOpportunity[];
}): SignalDetailPayload {
  // Lazy import avoided — themeIntel imports this module; keep a thin local builder here
  // and prefer buildThemeIntelDetail from callers when opportunities are available.
  const lines: string[] = [];
  if (input.status) lines.push(`Status: ${input.status}`);
  if (input.direction) lines.push(`Direction: ${input.direction}`);
  if (input.probability != null) lines.push(`Theme attention score: ${input.probability}%`);
  if (input.confidence != null) lines.push(`Model confidence: ${input.confidence}%`);
  if (input.timing) lines.push(`Timing: ${input.timing}`);
  if (input.deltaVsPrior != null) {
    lines.push(`Δ vs prior: ${input.deltaVsPrior > 0 ? "+" : ""}${input.deltaVsPrior}`);
  }
  if (input.beneficiaries?.length) {
    lines.push(`Who may benefit (context): ${input.beneficiaries.slice(0, 4).join(", ")}`);
  }
  if (input.supportingFactors?.length) {
    lines.push(`Why it matters: ${input.supportingFactors.slice(0, 3).join("; ")}`);
  }
  if (input.relatedSymbols?.length) {
    lines.push(`Related symbols: ${input.relatedSymbols.slice(0, 5).join(", ")}`);
  }
  const cooling =
    String(input.status ?? "").toLowerCase().includes("cool") ||
    String(input.status ?? "").toLowerCase().includes("weak") ||
    input.direction === "down";
  return {
    title: input.theme,
    category: "Today's Signals",
    definition: cooling
      ? `“${input.theme}” looks softer in the Daily Brief — research related desks carefully. Not a sell instruction.`
      : `“${input.theme}” is a developing Daily Brief story. Tap related watches or open a scorecard to go deeper — monitor only.`,
    confidence: input.confidence ?? input.probability,
    contextLines: lines.length ? lines : ["Open Opportunity Radar or Probability Engine for cascade detail."],
    nextSteps: beginnerNextSteps(input.relatedSymbols?.[0], "Trades"),
    journalNote: `Theme: ${input.theme}${input.status ? ` (${input.status})` : ""}`,
    journalMeta: { signalTitle: input.theme, symbol: input.relatedSymbols?.[0] },
    symbol: input.relatedSymbols?.[0],
    deepDiveModule: input.relatedSymbols?.[0] ? "trades" : undefined,
    deepDiveRow: input.relatedSymbols?.[0]
      ? {
          symbol: input.relatedSymbols[0],
          note: input.theme,
          timestamp: new Date().toISOString(),
          id: `theme-sym-${input.relatedSymbols[0]}`,
        }
      : undefined,
  };
}

export function confidenceDetail(symbol: string, confidence: number, title: string): SignalDetailPayload {
  return {
    title: "Desk attention",
    category: "Signal lens",
    definition:
      "How loud the desks are on this name from flow, volume, news, and similar setups. Informational only — not a probability of profit, not a buy score, and not a prediction.",
    symbol,
    confidence,
    contextLines: [
      `$${symbol}: ${title} · ${confidence}% desk attention.`,
      "Higher % means more cross-feed activity flagged — not that the stock will go up.",
    ],
    nextSteps: beginnerNextSteps(symbol, "Trades"),
    journalNote: `${symbol}: ${title} (${confidence}% desk attention)`,
    journalMeta: { symbol, signalTitle: title },
    deepDiveModule: "trades",
    deepDiveRow: {
      symbol,
      note: title,
      briefingNote: `${title} · ${confidence}% desk attention`,
      side: "buy",
      timestamp: new Date().toISOString(),
      id: `attn-${symbol}`,
    },
  };
}

export function scenarioDetail(symbol: string, expectedMove: string, title: string): SignalDetailPayload {
  return resolveSignalDetail("Modeled Scenario", {
    symbol,
    category: "Scenario*",
    contextLines: [title, expectedMove],
    journalNote: `${symbol}: ${expectedMove} — ${title}`,
    journalMeta: { symbol, signalTitle: title },
  });
}

export function activityWhyToDetail(
  why: { title: string; symbol?: string; confidence: number; reasons: string[]; signals?: string[] },
  module?: string
): SignalDetailPayload {
  const primary = why.signals?.[0] ?? why.title;
  return resolveSignalDetail(primary, {
    symbol: why.symbol,
    confidence: why.confidence,
    category: "Activity ledger",
    contextLines: why.reasons,
    journalNote: [why.symbol ? `$${why.symbol}` : null, why.title, `${why.confidence}%`].filter(Boolean).join(" · "),
    journalMeta: { module, symbol: why.symbol, signalTitle: why.title },
  });
}
