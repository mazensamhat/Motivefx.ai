import type {
  IntelPrefs,
  ProbabilityView,
  ConsensusBreak,
  MarketGenome,
  SignalAlertRule,
  ThemeSuggestion,
  ThemeWatchItem,
  WatchAgentRule,
} from "./types";

export const DEFAULT_INTEL_PREFS: IntelPrefs = {
  themeWatchlist: [],
  alertRules: [
    {
      id: "default-prob-75",
      kind: "probability_above",
      threshold: 75,
      enabled: true,
      label: "Motive Signal ≥ 75",
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
    watchAgents: Array.isArray(o.watchAgents)
      ? o.watchAgents.filter((rule): rule is WatchAgentRule => Boolean(rule) && typeof rule === "object")
        .slice(0, 25)
        .map((rule) => ({
          id: String(rule.id || `agent-${Date.now()}`).slice(0, 100),
          label: String(rule.label || "Watch Agent").slice(0, 120),
          metric: ["motive_signal","signal_change","evidence_confidence","divergence"].includes(rule.metric) ? rule.metric : "motive_signal",
          operator: ["above","below","changes_by"].includes(rule.operator) ? rule.operator : "above",
          threshold: Number.isFinite(Number(rule.threshold)) ? Math.max(0, Math.min(100, Number(rule.threshold))) : 70,
          targetType: ["any","symbol","theme","module"].includes(rule.targetType) ? rule.targetType : "any",
          target: rule.target ? String(rule.target).slice(0, 160) : undefined,
          windowHours: Number.isFinite(Number(rule.windowHours)) ? Math.max(1, Math.min(720, Math.round(Number(rule.windowHours)))) : 24,
          enabled: rule.enabled !== false,
          createdAt: typeof rule.createdAt === "string" ? rule.createdAt : new Date().toISOString(),
          delivery: "intel_alert",
        }))
      : [],
    portfolioBooks:
      o.portfolioBooks && typeof o.portfolioBooks === "object" ? o.portfolioBooks : undefined,
  };
}

/** Suggest themes for personalized watchlist from Motive Signal. */
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
          ? `Motive Signal rising (${v.deltaVsPrior > 0 ? "+" : ""}${v.deltaVsPrior} vs prior)`
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
            title: `Motive Signal alert: ${t.theme.slice(0, 64)}`,
            body: `Motive Signal ${t.motiveSignal ?? t.probability}/100 ≥ ${rule.threshold} (evidence confidence ${t.confidence}). This is not a calibrated outcome probability.`,
            confidence: t.confidence,
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


function agentTargetMatches(rule: WatchAgentRule, view: ProbabilityView): boolean {
  const target = (rule.target ?? "").trim().toLowerCase();
  if (rule.targetType === "any" || !target) return true;
  if (rule.targetType === "theme") return view.theme.toLowerCase().includes(target);
  if (rule.targetType === "module") return String(view.module ?? "").toLowerCase() === target;
  if (rule.targetType === "symbol") return (view.relatedSymbols ?? []).some((s) => s.toLowerCase() === target.replace(/^\$/, ""));
  return false;
}

function agentCondition(rule: WatchAgentRule, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (rule.operator === "below") return value <= rule.threshold;
  if (rule.operator === "changes_by") return Math.abs(value) >= rule.threshold;
  return value >= rule.threshold;
}

/** Evaluate user-authored Watch Agents against the current intelligence bundle. */
export function evaluateWatchAgents(
  rules: WatchAgentRule[],
  opts: { probabilityViews: ProbabilityView[]; consensusBreaks: ConsensusBreak[] }
): EvaluatedAlert[] {
  const out: EvaluatedAlert[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.metric === "divergence") {
      for (const row of opts.consensusBreaks) {
        const target = (rule.target ?? "").trim().toLowerCase();
        if (rule.targetType === "symbol" && target && !row.relatedSymbols.some((s) => s.toLowerCase() === target.replace(/^\$/, ""))) continue;
        if (rule.targetType === "module" && target && String(row.module ?? "").toLowerCase() !== target) continue;
        if (!agentCondition(rule, row.divergenceScore)) continue;
        out.push({
          module: row.module,
          symbol: row.relatedSymbols[0],
          title: `Watch Agent: ${rule.label}`,
          body: `Consensus divergence ${row.divergenceScore} matched your rule “${rule.label}”. ${row.breakReason}`.slice(0, 260),
          confidence: row.divergenceScore,
          alertKey: `agent-${rule.id}-${row.id}-${Math.round(row.divergenceScore)}`,
        });
      }
      continue;
    }
    for (const view of opts.probabilityViews) {
      if (!agentTargetMatches(rule, view)) continue;
      const value = rule.metric === "motive_signal"
        ? (view.motiveSignal ?? view.probability)
        : rule.metric === "evidence_confidence"
          ? view.confidence
          : (view.deltaVsPrior ?? 0);
      if (!agentCondition(rule, value)) continue;
      const metricLabel = rule.metric === "motive_signal" ? "Motive Signal"
        : rule.metric === "evidence_confidence" ? "evidence confidence" : "signal change";
      out.push({
        module: view.module,
        symbol: view.relatedSymbols[0],
        title: `Watch Agent: ${rule.label}`,
        body: `${view.theme}: ${metricLabel} ${Math.round(value * 10) / 10} matched your rule. Motive Signal is evidence strength, not outcome probability.`,
        confidence: view.confidence,
        alertKey: `agent-${rule.id}-${view.id}-${Math.round(value)}`,
      });
    }
  }
  return out.slice(0, 20);
}
