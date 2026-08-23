import type {
  IntelPrefs,
  ProbabilityView,
  ConsensusBreak,
  MarketGenome,
  SignalAlertRule,
  ThemeSuggestion,
  ThemeWatchItem,
} from "./types";

export const DEFAULT_INTEL_PREFS: IntelPrefs = {
  themeWatchlist: [],
  alertRules: [
    {
      id: "default-prob-75",
      kind: "probability_above",
      threshold: 75,
      enabled: true,
      label: "Theme probability ≥ 75%",
    },
    {
      id: "default-div-70",
      kind: "divergence_above",
      threshold: 70,
      enabled: true,
      label: "Consensus Break divergence ≥ 70",
    },
  ],
};

export function normalizePrefs(raw: unknown): IntelPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_INTEL_PREFS, alertRules: [...DEFAULT_INTEL_PREFS.alertRules] };
  const o = raw as Partial<IntelPrefs>;
  return {
    themeWatchlist: Array.isArray(o.themeWatchlist) ? o.themeWatchlist : [],
    alertRules: Array.isArray(o.alertRules) && o.alertRules.length
      ? o.alertRules
      : [...DEFAULT_INTEL_PREFS.alertRules],
    portfolioBooks:
      o.portfolioBooks && typeof o.portfolioBooks === "object" ? o.portfolioBooks : undefined,
  };
}

/** Suggest themes for personalized watchlist from Probability Engine. */
export function suggestThemes(
  views: ProbabilityView[],
  existing: ThemeWatchItem[]
): ThemeSuggestion[] {
  const have = new Set(existing.map((t) => t.theme.toLowerCase()));
  return views
    .filter((v) => v.id.startsWith("theme-"))
    .filter((v) => !have.has(v.theme.toLowerCase()))
    .filter((v) => v.probability >= 68)
    .slice(0, 5)
    .map((v) => ({
      id: v.id,
      theme: v.theme,
      probability: v.probability,
      confidence: v.confidence,
      reason:
        v.deltaVsPrior != null && v.deltaVsPrior > 0
          ? `Probability rising (${v.deltaVsPrior > 0 ? "+" : ""}${v.deltaVsPrior} vs prior)`
          : `Motive Signal ${v.probability}/100 · confidence ${v.confidence}`,
      beneficiaries: v.beneficiaries.slice(0, 3),
    }));
}

export type EvaluatedAlert = {
  module?: string;
  symbol?: string;
  title: string;
  body?: string;
  confidence?: number;
  alertKey: string;
};

/** Evaluate Phase 3 custom rules against live engine outputs. */
export function evaluateSignalAlertRules(
  rules: SignalAlertRule[],
  opts: {
    probabilityViews: ProbabilityView[];
    consensusBreaks: ConsensusBreak[];
    marketGenomes: MarketGenome[];
  }
): EvaluatedAlert[] {
  const out: EvaluatedAlert[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.kind === "probability_above") {
      const themes = opts.probabilityViews.filter((v) => v.id.startsWith("theme-"));
      for (const t of themes) {
        if (rule.themeId && t.id !== rule.themeId) continue;
        if (t.probability >= rule.threshold) {
          out.push({
            module: t.module,
            symbol: t.relatedSymbols[0],
            title: `Probability alert: ${t.theme.slice(0, 64)}`,
            body: `Motive Signal ${t.probability}/100 ≥ ${rule.threshold} (confidence ${t.confidence}). Informational only.`,
            confidence: t.probability,
            alertKey: `prob-${t.id}-${rule.threshold}`,
          });
        }
      }
    }
    if (rule.kind === "divergence_above") {
      for (const b of opts.consensusBreaks) {
        if (b.divergenceScore >= rule.threshold && b.id !== "cb-quiet-tape") {
          out.push({
            module: b.module,
            symbol: b.relatedSymbols[0],
            title: `Consensus Break: divergence ${b.divergenceScore}`,
            body: b.breakReason.slice(0, 220),
            confidence: b.divergenceScore,
            alertKey: `cb-${b.id}-${rule.threshold}`,
          });
        }
      }
    }
    if (rule.kind === "genome_risk") {
      for (const g of opts.marketGenomes) {
        const risk = g.traits.find((t) => t.key === "risk");
        const conf = g.traits.find((t) => t.key === "signal_strength");
        const riskVal = String(risk?.value ?? "");
        if (riskVal === "high" || riskVal === "extreme") {
          const score = Number(conf?.value ?? 60);
          if (score >= rule.threshold) {
            out.push({
              module: g.module,
              symbol: g.symbol,
              title: `Genome risk: $${g.symbol}`,
              body: `Market Genome risk=${riskVal} with strength ${score} ≥ ${rule.threshold}. Monitor-only.`,
              confidence: score,
              alertKey: `genome-risk-${g.module}-${g.symbol}-${rule.threshold}`,
            });
          }
        }
      }
    }
  }
  return out.slice(0, 12);
}
