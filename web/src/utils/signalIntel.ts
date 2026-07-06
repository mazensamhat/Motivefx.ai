import { SIGNAL_GLOSSARY, type GlossaryEntry } from "../config/signalGlossary";

export interface SignalDetailPayload {
  title: string;
  category: string;
  definition: string;
  example?: string;
  contextLines?: string[];
  symbol?: string;
  confidence?: number;
  journalNote?: string;
  journalMeta?: { module?: string; symbol?: string; signalTitle?: string };
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
  if (entry) {
    return {
      title: entry.term,
      category: entry.category,
      definition: entry.definition,
      example: entry.example,
      ...extra,
      contextLines: extra?.contextLines,
    };
  }

  return {
    title: label,
    category: extra?.category ?? "Signal",
    definition:
      extra?.definition ??
      `${label} is a live intel tag from MotiveFX desks. Cross-reference with the Why? panel and your own research — informational context only.`,
    ...extra,
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
  });
}

export function congressFlowDetail(t: {
  politician: string;
  symbol: string;
  transaction: string;
  amount: string;
  filedAt?: string;
}): SignalDetailPayload {
  return resolveSignalDetail("Congress / Insider Flow", {
    symbol: t.symbol,
    category: "Trades",
    contextLines: [
      `${t.politician} · ${t.transaction} ${t.symbol}`,
      `Disclosed amount: ${t.amount}`,
      t.filedAt ? `Filed ${t.filedAt}` : "",
    ].filter(Boolean),
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
    category: "Betting",
    contextLines: [
      l.matchup,
      `${l.sport}${l.book ? ` · ${l.book}` : ""}`,
      `Line: ${l.openingLine ?? "—"} → ${l.currentLine ?? "—"}`,
    ],
  });
}

export function sharpMoneyDetail(s: {
  matchup: string;
  sharpSide: string;
  signal: string;
}): SignalDetailPayload {
  return resolveSignalDetail("Sharp Money", {
    category: "Betting",
    contextLines: [
      s.matchup,
      `Sharp side: ${s.sharpSide}`,
      `Signal: ${s.signal.replace(/_/g, " ")}`,
    ],
  });
}

export function eventMarketDetail(m: {
  market: string;
  yes: number;
  volume24h?: string | number;
}): SignalDetailPayload {
  return resolveSignalDetail("Event Market", {
    category: "Predictions",
    contextLines: [
      m.market,
      `Implied yes: ${(m.yes * 100).toFixed(0)}%`,
      m.volume24h != null ? `24h volume: ${m.volume24h}` : "",
    ].filter(Boolean),
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
      `Score: ${score}/100 · ${stars} of 5 stars`,
      `Signal density: ${marketConfidence}`,
      "Higher scores mean more cross-desk activity is flagged right now.",
    ],
  });
}

export function confidenceDetail(symbol: string, confidence: number, title: string): SignalDetailPayload {
  return {
    title: "Signal strength",
    category: "Signal lens",
    definition:
      "Algorithmic signal strength from cross-referencing flow, volume, news, and historical similar setups. Informational context only — not a probability of profit or a prediction.",
    symbol,
    confidence,
    contextLines: [`${title} · ${confidence}% signal strength tier.`],
    journalNote: `${symbol}: ${title} (${confidence}% signal strength)`,
    journalMeta: { symbol, signalTitle: title },
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
