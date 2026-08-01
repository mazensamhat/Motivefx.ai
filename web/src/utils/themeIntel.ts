/**
 * Theme / radar / signal-graph → Signal Intel payloads with related watches.
 * Monitor-only stance language (no Buy/Sell trade orders).
 */

import type { BrandModuleId } from "../brand/moduleBrand";
import { APP_MODULE_TO_BRAND } from "../brand/moduleBrand";
import type { HomeOpportunity, ProbabilityView } from "../types";
import type { RadarCardModel } from "../components/OpportunityRadarBoard";
import { stanceLabel } from "./motiveRating";
import { beginnerNextSteps, stancePlainExplain } from "./signalClarity";
import type { RelatedWatchItem, SignalDetailPayload } from "./signalIntel";

export function brandModuleFromOpp(module: string): BrandModuleId {
  return APP_MODULE_TO_BRAND[module] ?? "trades";
}

export function deskName(module: string): string {
  const id = brandModuleFromOpp(module);
  if (id === "pinkslips") return "Pink Slips";
  if (id === "trades") return "Trades";
  if (id === "crypto") return "Crypto";
  if (id === "betting") return "Betting";
  if (id === "predictions") return "Predictions";
  return "Desk";
}

function isCautiousTheme(status?: string, band?: string, direction?: string): boolean {
  const s = `${status ?? ""} ${band ?? ""} ${direction ?? ""}`.toLowerCase();
  return (
    s.includes("weak") ||
    s.includes("risk") ||
    s.includes("cool") ||
    s.includes("down") ||
    s.includes("high_risk") ||
    s.includes("high risk")
  );
}

type WatchModule = RelatedWatchItem["deepDiveModule"];

interface CuratedWatch {
  symbol: string;
  module: WatchModule;
  why: string;
  cautiousWhy?: string;
}

interface ThemeWatchPool {
  id: string;
  match: RegExp;
  watches: CuratedWatch[];
}

const CURATED_THEME_WATCH_POOLS: ThemeWatchPool[] = [
  {
    id: "ai-infrastructure",
    match: /\b(ai|artificial intelligence|data center|datacenter|semi|chip|compute|infrastructure)\b/i,
    watches: [
      { symbol: "NVDA", module: "trades", why: "GPU demand is a direct read-through for AI infrastructure buildouts." },
      { symbol: "AVGO", module: "trades", why: "Networking silicon and custom accelerators sit inside the AI capex chain." },
      { symbol: "TSM", module: "trades", why: "Advanced foundry capacity is a bottleneck for AI chip supply." },
      { symbol: "SMCI", module: "trades", why: "AI server demand makes this a high-beta infrastructure watch." },
      { symbol: "AMD", module: "trades", why: "Accelerator competition keeps AMD tied to AI compute spending." },
    ],
  },
  {
    id: "energy-transition",
    match: /\b(energy transition|renewable|solar|battery|lithium|ev|clean energy|grid|power)\b/i,
    watches: [
      { symbol: "XOM", module: "trades", why: "Large-cap energy cash flows shape the transition spending backdrop." },
      { symbol: "CVX", module: "trades", why: "Integrated oil exposure tracks the conventional-energy side of transition pressure." },
      { symbol: "ENPH", module: "trades", why: "Solar inverter demand is sensitive to renewable adoption and rates." },
      { symbol: "FSLR", module: "trades", why: "Utility-scale solar orders are a direct transition read-through." },
      { symbol: "LIT", module: "trades", why: "Lithium and battery supply chains are core inputs for electrification." },
    ],
  },
  {
    id: "defense",
    match: /\b(defense|military|aerospace|geopolitical|weapons|missile|security spending|defence)\b/i,
    watches: [
      { symbol: "LMT", module: "trades", why: "Prime contractor backlog is closely tied to defense spending cycles." },
      { symbol: "RTX", module: "trades", why: "Missile defense and aerospace exposure link RTX to procurement headlines." },
      { symbol: "NOC", module: "trades", why: "Space, cyber, and strategic systems make NOC a defense-budget proxy." },
      { symbol: "GD", module: "trades", why: "Shipbuilding and combat systems connect GD to military appropriations." },
      { symbol: "KTOS", module: "pinkslips", why: "Drone and tactical systems exposure adds a higher-volatility defense watch." },
    ],
  },
  {
    id: "housing",
    match: /\b(housing|homebuilder|mortgage|real estate|rent|construction|home sales)\b/i,
    watches: [
      { symbol: "XHB", module: "trades", why: "Homebuilder ETF flow is a broad read on housing risk appetite." },
      { symbol: "LEN", module: "trades", why: "Large builder orders and incentives track demand in new homes." },
      { symbol: "DHI", module: "trades", why: "Scale and entry-level exposure make DHI sensitive to mortgage affordability." },
      { symbol: "HD", module: "trades", why: "Renovation demand often moves with housing turnover and equity." },
      { symbol: "OPEN", module: "pinkslips", why: "Housing transaction volatility makes OPEN a cautious, high-beta watch." },
    ],
  },
  {
    id: "inflation-rates",
    match: /\b(inflation|cpi|rates|fed|yield|treasury|stagflation|dollar)\b/i,
    watches: [
      { symbol: "TLT", module: "trades", why: "Long-duration Treasuries are sensitive to inflation and rate repricing." },
      { symbol: "GLD", module: "trades", why: "Gold often reacts to real-rate and inflation-hedge narratives." },
      { symbol: "XLP", module: "trades", why: "Staples can show how investors price defensive inflation exposure." },
      { symbol: "COST", module: "trades", why: "Traffic and pricing power make Costco a consumer-inflation watch." },
      { symbol: "BTC", module: "crypto", why: "Crypto liquidity can react quickly to dollar and real-rate expectations." },
    ],
  },
  {
    id: "china",
    match: /\b(china|tariff|export control|yuan|hong kong|beijing|taiwan|supply chain)\b/i,
    watches: [
      { symbol: "FXI", module: "trades", why: "Large-cap China ETF flow is the broadest liquid policy read-through." },
      { symbol: "BABA", module: "trades", why: "Mega-cap China internet sentiment often moves with policy tone." },
      { symbol: "KWEB", module: "trades", why: "China internet exposure tracks growth and regulatory expectations." },
      { symbol: "TSM", module: "trades", why: "Taiwan semiconductor supply risk is central to export-control headlines." },
      { symbol: "USDCNH", module: "crypto", why: "Offshore yuan pressure can spill into global risk and crypto liquidity." },
    ],
  },
  {
    id: "consumer",
    match: /\b(consumer|retail|holiday|spending|mall|ecommerce|e-commerce|wage)\b/i,
    watches: [
      { symbol: "AMZN", module: "trades", why: "E-commerce and cloud demand give AMZN broad consumer sensitivity." },
      { symbol: "WMT", module: "trades", why: "Grocery and value retail share show household spending pressure." },
      { symbol: "COST", module: "trades", why: "Membership traffic is a clean read on resilient consumer demand." },
      { symbol: "XLY", module: "trades", why: "Discretionary ETF flow summarizes risk appetite toward consumer cyclicals." },
      { symbol: "NKE", module: "trades", why: "Apparel demand and China exposure tie NKE to discretionary spending." },
    ],
  },
  {
    id: "industrial-freight",
    match: /\b(industrial|freight|rail|shipping|factory|manufacturing|logistics|supply)\b/i,
    watches: [
      { symbol: "CAT", module: "trades", why: "Machinery demand reflects construction, mining, and industrial capex." },
      { symbol: "DE", module: "trades", why: "Equipment orders are a cyclical read on farm and industrial spending." },
      { symbol: "UNP", module: "trades", why: "Rail volumes help confirm or question freight-cycle strength." },
      { symbol: "XLI", module: "trades", why: "Industrial ETF flow captures the broader cyclical basket." },
      { symbol: "FDX", module: "trades", why: "Package volumes and guidance are direct logistics-cycle indicators." },
    ],
  },
  {
    id: "crypto-liquidity",
    match: /\b(crypto|bitcoin|ethereum|stablecoin|token|on-chain|liquidity)\b/i,
    watches: [
      { symbol: "BTC", module: "crypto", why: "Bitcoin leads broad crypto risk appetite and liquidity swings." },
      { symbol: "ETH", module: "crypto", why: "Ethereum activity reflects app, staking, and risk-on crypto demand." },
      { symbol: "COIN", module: "trades", why: "Exchange revenue sensitivity links COIN to crypto trading activity." },
      { symbol: "MSTR", module: "trades", why: "Balance-sheet Bitcoin exposure makes MSTR a high-beta crypto proxy." },
      { symbol: "SOL", module: "crypto", why: "High-throughput chain activity can confirm speculative crypto momentum." },
    ],
  },
  {
    id: "policy-predictions",
    match: /\b(election|policy|congress|regulation|approval|court|budget|shutdown)\b/i,
    watches: [
      { symbol: "Policy outcome odds", module: "predictions", why: "Prediction markets can show whether policy odds are repricing." },
      { symbol: "SPY", module: "trades", why: "Broad-market ETF flow shows whether policy risk is hitting risk appetite." },
      { symbol: "XLF", module: "trades", why: "Financials often react quickly to regulatory and rate-policy shifts." },
      { symbol: "TLT", module: "trades", why: "Treasuries track the rates channel for budget and policy headlines." },
      { symbol: "Election volatility", module: "betting", why: "Betting-market swings can flag changing political risk assumptions." },
    ],
  },
];

const DEFAULT_THEME_WATCHES: CuratedWatch[] = [
  { symbol: "SPY", module: "trades", why: "Broad-market flow helps confirm whether the theme is spreading." },
  { symbol: "QQQ", module: "trades", why: "Growth exposure is a useful cross-check for risk appetite." },
  { symbol: "IWM", module: "trades", why: "Small-cap breadth can confirm or challenge the theme." },
  { symbol: "TLT", module: "trades", why: "Rates can amplify or mute theme pressure across desks." },
  { symbol: "BTC", module: "crypto", why: "Crypto liquidity offers an early read on speculative risk tone." },
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function themeKey(opts: {
  theme?: string;
  themeId?: string;
  relatedSymbols?: string[];
  beneficiaries?: string[];
  affectedAssets?: string[];
}): string {
  return [
    opts.themeId,
    opts.theme,
    ...(opts.relatedSymbols ?? []),
    ...(opts.beneficiaries ?? []),
    ...(opts.affectedAssets ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function curatedPoolForTheme(key: string): CuratedWatch[] {
  const pool = CURATED_THEME_WATCH_POOLS.find((p) => p.match.test(key))?.watches ?? DEFAULT_THEME_WATCHES;
  return pool;
}

function rotateBySeed<T>(items: T[], seedKey: string): T[] {
  if (items.length <= 1) return [...items];
  const start = hashString(seedKey) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function curatedWatch(
  watch: CuratedWatch,
  input: {
    theme: string;
    seedKey: string;
    cautious: boolean;
  }
): RelatedWatchItem {
  const seed = hashString(`${input.seedKey}:${watch.symbol}:${watch.module}`);
  const attention = input.cautious ? 55 + (seed % 18) : 68 + (seed % 22);
  const why = input.cautious && watch.cautiousWhy ? watch.cautiousWhy : watch.why;
  const stance = input.cautious ? "Cautious attention" : "Supportive attention";
  const side = input.cautious ? "sell" : "buy";
  const id = `theme-curated-${hashString(`${input.seedKey}:${watch.symbol}`).toString(36)}`;

  return {
    symbol: watch.symbol,
    desk: deskName(watch.module),
    stanceLabel: stance,
    attention,
    blurb: `${stance}: ${why}`,
    deepDiveModule: watch.module,
    deepDiveRow: {
      symbol: watch.symbol,
      note: why,
      briefingNote: `${input.theme}: ${why}`,
      side,
      type: input.cautious && watch.module === "trades" ? "put" : watch.module === "trades" ? "call" : undefined,
      matchup: watch.module === "betting" ? watch.symbol : undefined,
      market: watch.module === "predictions" ? watch.symbol : undefined,
      asset: watch.module === "crypto" ? watch.symbol : undefined,
      direction: watch.module === "crypto" ? (input.cautious ? "outflow watch" : "inflow watch") : undefined,
      yes: watch.module === "predictions" ? attention / 100 : undefined,
      platform: watch.module === "predictions" ? "Theme watch" : undefined,
      categoryLabel: watch.module === "predictions" ? "Theme probability" : undefined,
      timestamp: new Date().toISOString(),
      id,
    },
  };
}

function opportunityWatch(
  o: HomeOpportunity,
  cautiousTheme: boolean,
  theme?: string
): RelatedWatchItem {
  const mod = brandModuleFromOpp(o.module);
  const rawStance = stanceLabel(o.stance ?? o.title);
  const lean =
    cautiousTheme && !/caution|defensive|avoid|mixed/i.test(rawStance)
      ? "Elevated caution"
      : rawStance;
  const themeTie = theme
    ? `Related to "${theme}" through live ${deskName(o.module)} desk signals.`
    : `${o.confidence}% desk attention.`;
  const blurb = cautiousTheme
    ? `Cautious attention: ${themeTie} Treat as awareness, not an order.`
    : `Supportive attention: ${themeTie}`;

  return {
    symbol: o.symbol,
    desk: deskName(o.module),
    stanceLabel: lean,
    attention: o.confidence,
    blurb,
    deepDiveModule: mod === "home" ? "trades" : (mod as RelatedWatchItem["deepDiveModule"]),
    deepDiveRow: {
      symbol: o.symbol,
      note: o.reasons?.[0] ?? o.title,
      briefingNote: o.reasons?.slice(0, 2).join(" "),
      side: /avoid|defensive|sell|caution/i.test(lean) ? "sell" : "buy",
      type: o.signals?.some((s) => /put/i.test(s)) ? "put" : o.signals?.some((s) => /call/i.test(s)) ? "call" : undefined,
      matchup: o.module === "betting" ? o.symbol : undefined,
      market: o.module === "predictions" ? o.symbol : undefined,
      asset: o.module === "crypto" ? o.symbol : undefined,
      timestamp: new Date().toISOString(),
      id: o.id,
    },
  };
}

/** Pick related opportunities for a theme/radar card — prefer symbol overlap, then diversify desks. */
export function pickRelatedWatches(
  opportunities: HomeOpportunity[],
  opts: {
    relatedSymbols?: string[];
    beneficiaries?: string[];
    affectedAssets?: string[];
    themeId?: string;
    theme?: string;
    cautious?: boolean;
    limit?: number;
  }
): RelatedWatchItem[] {
  const limit = opts.limit ?? 5;
  const keys = new Set(
    [...(opts.relatedSymbols ?? []), ...(opts.beneficiaries ?? []), ...(opts.affectedAssets ?? [])]
      .map((s) => s.toUpperCase().replace(/^\$/, "").slice(0, 12))
      .filter(Boolean)
  );
  const themeWords = (opts.theme ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

  const scored = opportunities.map((o) => {
    const sym = o.symbol.toUpperCase().replace(/^\$/, "");
    let score = 0;
    if (keys.has(sym) || [...keys].some((k) => sym.includes(k) || k.includes(sym))) score += 10;
    if (o.beneficiaries?.some((b) => keys.has(b.toUpperCase()))) score += 4;
    if (o.genomeThemes?.some((t) => themeWords.some((w) => t.toLowerCase().includes(w)))) score += 3;
    if (themeWords.some((w) => o.title.toLowerCase().includes(w) || o.symbol.toLowerCase().includes(w))) {
      score += 2;
    }
    score += o.confidence / 100;
    const relevanceScore = score - o.confidence / 100;
    return { o, score, relevanceScore };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: HomeOpportunity[] = [];
  const seenMod = new Set<string>();
  for (const { o, relevanceScore } of scored) {
    if (picked.length >= limit) break;
    if (relevanceScore < 1) continue;
    // Prefer desk diversity after first two matches
    if (
      picked.length >= 2 &&
      seenMod.has(o.module) &&
      scored.some((x) => !seenMod.has(x.o.module) && x.relevanceScore >= 1)
    ) {
      continue;
    }
    picked.push(o);
    seenMod.add(o.module);
  }

  const theme = opts.theme ?? "this theme";
  const seedKey = themeKey(opts) || theme;
  const watches = picked.slice(0, limit).map((o) => opportunityWatch(o, Boolean(opts.cautious), theme));
  const seenWatchKeys = new Set(watches.map((w) => `${w.deepDiveModule}:${w.symbol.toUpperCase()}`));

  for (const watch of rotateBySeed(curatedPoolForTheme(seedKey), seedKey)) {
    if (watches.length >= limit) break;
    const key = `${watch.module}:${watch.symbol.toUpperCase()}`;
    if (seenWatchKeys.has(key)) continue;
    watches.push(curatedWatch(watch, { theme, seedKey, cautious: Boolean(opts.cautious) }));
    seenWatchKeys.add(key);
  }

  // Last-resort fill only after theme-aware watches are exhausted.
  if (watches.length < Math.min(3, opportunities.length)) {
    for (const { o } of scored) {
      if (watches.length >= limit) break;
      const mod = brandModuleFromOpp(o.module);
      const key = `${mod}:${o.symbol.toUpperCase()}`;
      if (seenWatchKeys.has(key)) continue;
      watches.push(opportunityWatch(o, Boolean(opts.cautious), theme));
      seenWatchKeys.add(key);
    }
  }

  return watches.slice(0, limit);
}

export function buildThemeIntelDetail(input: {
  themeId?: string;
  theme: string;
  status?: string;
  band?: string;
  direction?: string;
  probability?: number;
  confidence?: number;
  timing?: string;
  beneficiaries?: string[];
  supportingFactors?: string[];
  relatedSymbols?: string[];
  affectedAssets?: string[];
  drivers?: string[];
  description?: string;
  deltaVsPrior?: number;
  opportunities?: HomeOpportunity[];
}): SignalDetailPayload {
  const cautious = isCautiousTheme(input.status, input.band, input.direction);
  const watches = pickRelatedWatches(input.opportunities ?? [], {
    relatedSymbols: input.relatedSymbols,
    beneficiaries: input.beneficiaries,
    affectedAssets: input.affectedAssets,
    themeId: input.themeId,
    theme: input.theme,
    cautious,
    limit: 5,
  });

  const plain = cautious
    ? `“${input.theme}” is showing softer or higher-risk pressure in the Daily Brief. That means watch related desks more carefully — not that you must sell anything.`
    : `“${input.theme}” is a developing story in the Daily Brief. MotiveFX surfaces where attention is rising across desks so you can research — monitor only, not a trade order.`;

  const lines: string[] = [];
  if (input.description) lines.push(input.description);
  if (input.status) lines.push(`Status: ${input.status}`);
  if (input.direction) lines.push(`Direction: ${input.direction}`);
  if (input.probability != null) lines.push(`Theme attention score: ${input.probability}%`);
  if (input.confidence != null) lines.push(`Model confidence: ${input.confidence}%`);
  if (input.timing) lines.push(`Timing: ${input.timing}`);
  if (input.deltaVsPrior != null) {
    lines.push(`Δ vs prior: ${input.deltaVsPrior > 0 ? "+" : ""}${input.deltaVsPrior}`);
  }
  if (input.drivers?.length) lines.push(`Drivers: ${input.drivers.slice(0, 3).join("; ")}`);
  if (input.supportingFactors?.length) {
    lines.push(`Why it matters: ${input.supportingFactors.slice(0, 3).join("; ")}`);
  }
  if (input.beneficiaries?.length) {
    lines.push(
      cautious
        ? `Names in the cascade (watchlist): ${input.beneficiaries.slice(0, 4).join(", ")}`
        : `Who may benefit (context): ${input.beneficiaries.slice(0, 4).join(", ")}`
    );
  }
  if (input.affectedAssets?.length) {
    lines.push(`Affected assets to watch: ${input.affectedAssets.slice(0, 4).join(", ")}`);
  }
  lines.push(stancePlainExplain(cautious ? "would_avoid" : "would_hold"));

  const primarySym = watches[0]?.symbol;
  const primaryMod = watches[0]?.deepDiveModule;

  return {
    title: input.theme,
    category: "Opportunity Radar",
    definition: plain,
    confidence: input.confidence ?? input.probability,
    contextLines: lines,
    nextSteps: [
      "Read the related watches below — each opens a full scorecard.",
      ...beginnerNextSteps(primarySym, cautious ? "Pink Slips" : "Trades").slice(0, 2),
    ],
    relatedWatches: watches,
    symbol: primarySym,
    deepDiveModule: primaryMod,
    deepDiveRow: watches[0]?.deepDiveRow,
    journalNote: `Theme: ${input.theme}${input.status ? ` (${input.status})` : ""}`,
    journalMeta: { signalTitle: input.theme, symbol: primarySym },
  };
}

export function buildThemeFromProbabilityView(
  theme: ProbabilityView,
  opportunities: HomeOpportunity[],
  statusLabel?: string
): SignalDetailPayload {
  const rising = theme.direction === "up" || (theme.deltaVsPrior ?? 0) > 0;
  const cooling = theme.direction === "down" || (theme.deltaVsPrior ?? 0) < 0;
  const status =
    statusLabel ?? (rising ? "↑ Rising" : cooling ? "↓ Cooling" : "→ Stable");
  return buildThemeIntelDetail({
    themeId: theme.id,
    theme: theme.theme,
    status,
    direction: theme.direction,
    probability: theme.probability,
    confidence: theme.confidence,
    timing: theme.timing,
    beneficiaries: theme.beneficiaries,
    supportingFactors: theme.supportingFactors,
    relatedSymbols: theme.relatedSymbols,
    deltaVsPrior: theme.deltaVsPrior,
    opportunities,
  });
}

export function buildRadarCardDetail(
  card: RadarCardModel,
  opportunities: HomeOpportunity[]
): SignalDetailPayload {
  return buildThemeIntelDetail({
    themeId: card.id,
    theme: card.title,
    status: card.status,
    band: card.band,
    probability: card.signalScore,
    confidence: card.confidence,
    timing: card.horizon,
    beneficiaries: card.beneficiaries,
    affectedAssets: card.affectedAssets,
    drivers: card.drivers,
    description: card.description,
    deltaVsPrior: card.delta,
    opportunities,
  });
}

export function buildGraphLinkDetail(input: {
  hubLabel: string;
  satLabel: string;
  relation: string;
  weight: number;
  opportunities: HomeOpportunity[];
}): SignalDetailPayload {
  const theme = `${input.hubLabel} → ${input.satLabel}`;
  const watches = pickRelatedWatches(input.opportunities, {
    theme: `${input.hubLabel} ${input.satLabel}`,
    relatedSymbols: input.opportunities.slice(0, 8).map((o) => o.symbol),
    cautious: input.weight < 0.45,
    limit: 5,
  });
  return {
    title: theme,
    category: "Signal Graph",
    definition: `When ${input.hubLabel.toLowerCase()} moves, ${input.satLabel.toLowerCase()} often feels it through ${input.relation}. This is a transmission map — not a trade recommendation.`,
    confidence: Math.round(input.weight * 100),
    contextLines: [
      `Link strength: ${Math.round(input.weight * 100)}%`,
      `Relation: ${input.relation}`,
      `Hub: ${input.hubLabel} · Satellite: ${input.satLabel}`,
      "Open related watches below for the same scorecard you get on holdings.",
    ],
    nextSteps: [
      "Tap a related watch to open its full scorecard.",
      "Switch hubs on the graph to see other transmission paths.",
      "Cross-check news for both sides of the link before acting in any app.",
    ],
    relatedWatches: watches,
    symbol: watches[0]?.symbol,
    deepDiveModule: watches[0]?.deepDiveModule,
    deepDiveRow: watches[0]?.deepDiveRow,
    journalNote: `Graph: ${theme} (${input.relation})`,
    journalMeta: { signalTitle: theme, symbol: watches[0]?.symbol },
  };
}
