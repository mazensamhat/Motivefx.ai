import { allowsDemoFeeds } from "@/lib/terminal/market-truth";
import {
  classifyMotiveStance,
  formatMotiveSignalLabel,
} from "@/lib/terminal/market-truth";
import { recordProbabilityViewsToLedger } from "@/lib/terminal/market-truth/record-from-views";
import { OPPORTUNITY_RADAR_DEMO } from "@/lib/marketing-copy";
import type { Direction, ProbabilityFactor, ProbabilityView } from "./types";

type FeedOpp = {
  id?: string;
  module?: string;
  symbol?: string;
  title?: string;
  confidence?: number;
  signals?: string[];
  reasons?: string[];
  riskLevel?: string;
};

/** In-memory prior Motive Signal scores for delta (TTL ~1h process cache). */
const priorCache = new Map<string, { probability: number; at: number }>();
const PRIOR_TTL_MS = 60 * 60 * 1000;

function directionFromScore(c: number): Direction {
  if (c >= 68) return "up";
  if (c <= 42) return "down";
  return "neutral";
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function moduleFlowBoost(module?: string): number {
  switch (module) {
    case "trades":
      return 4;
    case "crypto":
      return 3;
    case "penny":
      return 2;
    case "betting":
      return 1;
    case "predictions":
      return 3;
    default:
      return 0;
  }
}

function riskPenalty(risk?: string): number {
  if (risk === "extreme") return -8;
  if (risk === "high") return -4;
  if (risk === "low") return 2;
  return 0;
}

function signalDiversity(signals?: string[]): number {
  const n = signals?.length ?? 0;
  if (n >= 4) return 5;
  if (n >= 3) return 3;
  if (n >= 2) return 1;
  return 0;
}

/**
 * Motive Signal views — score is evidence-alignment strength (0–100), NOT a calibrated probability.
 * G2: OPPORTUNITY_RADAR_DEMO priors are excluded from PRODUCTION scoring.
 */
export function buildProbabilityViews(
  opportunities: FeedOpp[],
  sentiment?: { reddit?: string; x?: string; news?: string }
): ProbabilityView[] {
  const views: ProbabilityView[] = [];
  const now = Date.now();

  const liveAvg =
    opportunities.length > 0
      ? opportunities.reduce((s, o) => s + Number(o.confidence ?? 60), 0) / opportunities.length
      : 62;
  const densityNudge = clamp(liveAvg - 62, -8, 10);
  const sentimentNudge =
    sentiment?.news === "bullish" || sentiment?.reddit === "bullish"
      ? 3
      : sentiment?.news === "bearish"
        ? -3
        : 0;

  /* Demo/marketing theme cards only outside PRODUCTION — never as live Motive Signal priors. */
  if (allowsDemoFeeds()) {
    for (const [i, theme] of OPPORTUNITY_RADAR_DEMO.entries()) {
      const deskHit = opportunities[i] ?? opportunities[0];
      const factors: ProbabilityFactor[] = [
        { key: "prior", label: "Theme prior (demo)", score: theme.probability, weight: 0.35 },
        { key: "desk_density", label: "Desk signal density", score: clamp(62 + densityNudge), weight: 0.25 },
        {
          key: "corroboration",
          label: "Radar corroboration",
          score: Number(deskHit?.confidence ?? 55),
          weight: 0.2,
        },
        {
          key: "sentiment",
          label: "Narrative alignment",
          score: clamp(50 + sentimentNudge * 5),
          weight: 0.1,
        },
        {
          key: "module_flow",
          label: "Module flow boost",
          score: clamp(50 + moduleFlowBoost(deskHit?.module) * 4),
          weight: 0.1,
        },
      ];
      const probability = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0));
      const confidence = clamp(
        probability * 0.7 +
          Number(deskHit?.confidence ?? 55) * 0.2 +
          signalDiversity(deskHit?.signals) * 2
      );
      const id = `theme-demo-${i}`;
      views.push({
        id,
        theme: theme.theme,
        direction: directionFromScore(probability),
        probability,
        confidence,
        timing:
          i === 0
            ? "3–9 months"
            : i === 1
              ? "6–18 months"
              : i === 2
                ? "6–24 months"
                : i === 3
                  ? "1–6 months"
                  : "2–8 months",
        beneficiaries: [...theme.beneficiaries],
        supportingFactors: factors
          .sort((a, b) => b.score * b.weight - a.score * a.weight)
          .slice(0, 3)
          .map((f) => `${f.label}: ${f.score}`),
        alternatives: [
          "Macro shock could delay the theme.",
          "Crowded positioning may compress forward edge.",
        ],
        analogues: ["Prior mid-cycle theme rotations*", "Supply-chain reallocation windows*"],
        relatedSymbols: opportunities
          .slice(0, 3)
          .map((o) => String(o.symbol ?? ""))
          .filter(Boolean),
        module: deskHit?.module,
        factors,
        calibrationNote: `DEMO MODE — ${formatMotiveSignalLabel(probability)}. Not a statistical probability.`,
      });
    }
  }

  for (const o of opportunities.slice(0, 6)) {
    const conf = Number(o.confidence ?? 60);
    const factors: ProbabilityFactor[] = [
      { key: "desk", label: "Desk signal strength", score: conf, weight: 0.45 },
      {
        key: "diversity",
        label: "Factor diversity",
        score: clamp(50 + signalDiversity(o.signals) * 8),
        weight: 0.2,
      },
      {
        key: "risk",
        label: "Risk adjustment",
        score: clamp(55 + riskPenalty(o.riskLevel) * 2),
        weight: 0.15,
      },
      {
        key: "module",
        label: "Module flow",
        score: clamp(52 + moduleFlowBoost(o.module) * 5),
        weight: 0.1,
      },
      {
        key: "sentiment",
        label: "Narrative",
        score: clamp(50 + sentimentNudge * 4),
        weight: 0.1,
      },
    ];
    const probability = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0));
    const id = `opp-${o.id ?? o.symbol}`;
    const prior = priorCache.get(id);
    const priorProbability =
      prior && now - prior.at < PRIOR_TTL_MS ? prior.probability : undefined;
    priorCache.set(id, { probability, at: now });
    const stance = classifyMotiveStance(probability);

    views.push({
      id,
      theme: `${o.symbol}: ${o.title ?? "signal"}`,
      direction: directionFromScore(conf),
      probability,
      confidence: conf,
      timing: "near-term desk window",
      beneficiaries: (o.signals ?? []).slice(0, 3),
      supportingFactors: (o.reasons ?? []).slice(0, 3),
      alternatives: [
        "Signal can fade if volume/flow normalizes.",
        "Headline risk can invalidate confluence.",
      ],
      relatedSymbols: [String(o.symbol ?? "")].filter(Boolean),
      module: o.module,
      factors,
      calibrationNote: `${formatMotiveSignalLabel(probability)} (${stance}). Evidence alignment — not a forecast probability.`,
      priorProbability,
      deltaVsPrior: priorProbability != null ? probability - priorProbability : undefined,
    });
  }

  const sorted = views.sort((a, b) => b.probability - a.probability);
  recordProbabilityViewsToLedger(sorted, opportunities);
  return sorted;
}

export function probabilityEnrichment(view: ProbabilityView) {
  return {
    /** @deprecated name retained for API compat — value is Motive Signal /100 */
    probability: view.probability,
    motiveSignal: view.probability,
    stance: classifyMotiveStance(view.probability),
    label: formatMotiveSignalLabel(view.probability),
    modelConfidence: view.confidence,
    direction: view.direction,
    beneficiaries: view.beneficiaries,
    supportingFactors: view.supportingFactors,
    factors: view.factors,
    deltaVsPrior: view.deltaVsPrior,
  };
}
