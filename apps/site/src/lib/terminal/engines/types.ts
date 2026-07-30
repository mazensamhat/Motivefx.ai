/** Shared Phase 2 intelligence engine types — monitor-only, not advice. */

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
}

export interface ConsensusBreak {
  id: string;
  claim: string;
  breakReason: string;
  divergenceScore: number;
  relatedSymbols: string[];
  module?: string;
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

export interface Phase2IntelBundle {
  signalGraph: SignalGraph;
  probabilityViews: ProbabilityView[];
  consensusBreaks: ConsensusBreak[];
  futureScenarios: FutureSimResult;
  marketGenomes: MarketGenome[];
}
