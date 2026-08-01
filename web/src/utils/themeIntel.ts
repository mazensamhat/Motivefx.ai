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

function opportunityWatch(
  o: HomeOpportunity,
  cautiousTheme: boolean
): RelatedWatchItem {
  const mod = brandModuleFromOpp(o.module);
  const rawStance = stanceLabel(o.stance ?? o.title);
  const lean =
    cautiousTheme && !/caution|defensive|avoid|mixed/i.test(rawStance)
      ? "Elevated caution"
      : rawStance;
  const blurb = cautiousTheme
    ? `Watch $${o.symbol} on the ${deskName(o.module)} desk — theme pressure is softer; treat as awareness, not a sell order.`
    : `Watch $${o.symbol} on the ${deskName(o.module)} desk · ${o.confidence}% desk attention.`;

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
    return { o, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: HomeOpportunity[] = [];
  const seenMod = new Set<string>();
  for (const { o, score } of scored) {
    if (picked.length >= limit) break;
    if (score < 1 && picked.length >= 2) continue;
    // Prefer desk diversity after first two matches
    if (picked.length >= 2 && seenMod.has(o.module) && scored.some((x) => !seenMod.has(x.o.module) && x.score > 0)) {
      continue;
    }
    picked.push(o);
    seenMod.add(o.module);
  }

  // Fill remaining with top desks if thin
  if (picked.length < Math.min(3, opportunities.length)) {
    for (const { o } of scored) {
      if (picked.length >= limit) break;
      if (!picked.includes(o)) picked.push(o);
    }
  }

  return picked.slice(0, limit).map((o) => opportunityWatch(o, Boolean(opts.cautious)));
}

export function buildThemeIntelDetail(input: {
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
