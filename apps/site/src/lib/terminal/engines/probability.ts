import { OPPORTUNITY_RADAR_DEMO } from "@/lib/marketing-copy";
import type { Direction, ProbabilityView } from "./types";

type FeedOpp = {
  id?: string;
  module?: string;
  symbol?: string;
  title?: string;
  confidence?: number;
  signals?: string[];
  reasons?: string[];
};

function directionFromConfidence(c: number): Direction {
  if (c >= 68) return "up";
  if (c <= 42) return "down";
  return "neutral";
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/**
 * Probability Engine — blends theme seeds with live Opportunity Radar confidence.
 * Returns probability (outcome likelihood under current signals) + confidence (evidence trust).
 */
export function buildProbabilityViews(opportunities: FeedOpp[]): ProbabilityView[] {
  const views: ProbabilityView[] = [];

  // Theme cards from blueprint seeds, nudged by live desk density
  const liveAvg =
    opportunities.length > 0
      ? opportunities.reduce((s, o) => s + Number(o.confidence ?? 60), 0) / opportunities.length
      : 62;
  const densityNudge = clamp(liveAvg - 62, -8, 10);

  for (const [i, theme] of OPPORTUNITY_RADAR_DEMO.entries()) {
    const probability = clamp(theme.probability + densityNudge * 0.4);
    const confidence = clamp(probability - 4 + (i === 0 ? 3 : 0));
    views.push({
      id: `theme-${i}`,
      theme: theme.theme,
      direction: directionFromConfidence(probability),
      probability,
      confidence,
      timing: i === 0 ? "3–9 months" : i === 1 ? "1–6 months" : "2–8 months",
      beneficiaries: [...theme.beneficiaries],
      supportingFactors: [
        "Cross-market signal confluence above baseline.",
        "Second-order industry links lighting up on the Relationship Engine.",
        opportunities[0]
          ? `Desk corroboration: $${opportunities[0].symbol} (${opportunities[0].confidence}% strength).`
          : "Desk feeds warming — seed priors active.",
      ],
      alternatives: [
        "Macro shock could delay the theme.",
        "Crowded positioning may compress forward edge.",
      ],
      analogues: ["Prior mid-cycle theme rotations*", "Supply-chain reallocation windows*"],
      relatedSymbols: opportunities.slice(0, 3).map((o) => String(o.symbol ?? "")).filter(Boolean),
      module: opportunities[i]?.module,
    });
  }

  // Per-opportunity probability wrappers for Opportunity Radar enrichment
  for (const o of opportunities.slice(0, 6)) {
    const conf = Number(o.confidence ?? 60);
    const probability = clamp(conf * 0.92 + 4);
    views.push({
      id: `opp-${o.id ?? o.symbol}`,
      theme: `${o.symbol}: ${o.title ?? "signal"}`,
      direction: directionFromConfidence(conf),
      probability,
      confidence: conf,
      timing: "near-term desk window",
      beneficiaries: (o.signals ?? []).slice(0, 3),
      supportingFactors: (o.reasons ?? []).slice(0, 3),
      alternatives: ["Signal can fade if volume/flow normalizes.", "Headline risk can invalidate confluence."],
      relatedSymbols: [String(o.symbol ?? "")].filter(Boolean),
      module: o.module,
    });
  }

  return views.sort((a, b) => b.probability - a.probability);
}

/** Map a ProbabilityView onto HomeOpportunity-style enrichment fields. */
export function probabilityEnrichment(view: ProbabilityView) {
  return {
    probability: view.probability,
    modelConfidence: view.confidence,
    direction: view.direction,
    beneficiaries: view.beneficiaries,
    supportingFactors: view.supportingFactors,
  };
}
