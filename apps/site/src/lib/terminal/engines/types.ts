/** Shared Phase 2/3 intelligence engine types — monitor-only, not advice. */

export type GraphNodeKind = "macro" | "sector" | "asset" | "theme";

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
  weight: number;
  evidenceIds?: string[];
}

export interface SignalGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeNodeId: string;
  generatedAt: string;
}

export type Direction = "up" | "down" | "neutral";

export interface ProbabilityFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
}

export interface ProbabilityView {
  id: string;
  theme: string;
  direction: Direction;
  probability: number;
  confidence: number;
  timing?: string;
  beneficiaries: string[];
  supportingFactors: string[];
  alternatives: string[];
  analogues?: string[];
  relatedSymbols: string[];
  module?: string;
  /** Phase 3 multi-factor breakdown */
  factors?: ProbabilityFactor[];
  calibrationNote?: string;
  priorProbability?: number;
  deltaVsPrior?: number;
}

export interface ConsensusBreak {
  id: string;
  claim: string;
  breakReason: string;
  divergenceScore: number;
  relatedSymbols: string[];
  module?: string;
  priorScore?: number;
  deltaVsPrior?: number;
  resolvedHint?: string;
}

export interface ConsensusHistoryPoint {
  at: string;
  avgDivergence: number;
  topId: string;
  topScore: number;
}

export interface ScenarioBranch {
  id: string;
  label: string;
  probability: number;
  effects: string[];
  invalidators?: string[];
}

export interface FutureSimResult {
  seedEvent: string;
  horizon: string;
  branches: ScenarioBranch[];
  disclaimer: string;
  generatedAt: string;
  pathCount?: number;
  ensembleNote?: string;
}

export interface GenomeTrait {
  key: string;
  value: string | number;
  source?: string;
}

export interface MarketGenome {
  symbol: string;
  module: string;
  traits: GenomeTrait[];
  relatedThemes: string[];
  relatedNodes: string[];
  updatedAt: string;
}

export type AlertRuleKind = "probability_above" | "divergence_above" | "genome_risk";

export interface SignalAlertRule {
  id: string;
  kind: AlertRuleKind;
  threshold: number;
  themeId?: string;
  enabled: boolean;
  label?: string;
}

export interface ThemeWatchItem {
  id: string;
  theme: string;
  source: "user" | "suggested";
  probability?: number;
  addedAt: string;
}

export interface PortfolioBook {
  id: string;
  name: string;
  holdings: Array<{
    symbol: string;
    shares?: number;
    amount?: number;
    avg_cost?: number;
  }>;
  updatedAt: string;
}

export interface ModulePortfolioBooks {
  activeId: string;
  books: PortfolioBook[];
}

export type PortfolioBooksState = Partial<
  Record<"trades" | "crypto" | "penny", ModulePortfolioBooks>
>;

export interface IntelPrefs {
  themeWatchlist: ThemeWatchItem[];
  alertRules: SignalAlertRule[];
  /** Ultra+ named ledgers per market module (synced with active UserPortfolio). */
  portfolioBooks?: PortfolioBooksState;
}

export interface ThemeSuggestion {
  id: string;
  theme: string;
  probability: number;
  confidence: number;
  reason: string;
  beneficiaries: string[];
}

export interface Phase2IntelBundle {
  signalGraph: SignalGraph;
  probabilityViews: ProbabilityView[];
  consensusBreaks: ConsensusBreak[];
  consensusHistory?: ConsensusHistoryPoint[];
  futureScenarios: FutureSimResult;
  marketGenomes: MarketGenome[];
  themeSuggestions?: ThemeSuggestion[];
}
