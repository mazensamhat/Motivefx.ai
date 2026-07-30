import { buildSignalGraph, neighborsOf } from "./signal-graph";
import { buildProbabilityViews } from "./probability";
import { detectConsensusBreaks } from "./consensus-break";
import { simulateFuture } from "./future-simulator";
import { buildMarketGenomes } from "./market-genome";
import type { Phase2IntelBundle } from "./types";

export * from "./types";
export { buildSignalGraph, neighborsOf } from "./signal-graph";
export { buildProbabilityViews, probabilityEnrichment } from "./probability";
export { detectConsensusBreaks } from "./consensus-break";
export { simulateFuture } from "./future-simulator";
export { buildMarketGenomes, buildMarketGenome, genomeForSymbol } from "./market-genome";

type FeedOpp = {
  id?: string;
  module?: string;
  symbol?: string;
  title?: string;
  confidence?: number;
  signals?: string[];
  reasons?: string[];
  riskLevel?: string;
  expectedMove?: string;
  stance?: string;
};

/**
 * Run all Phase 2 engines against current Opportunity Radar rows.
 */
export function runPhase2Engines(opts: {
  opportunities: FeedOpp[];
  marketConfidenceLabel: string;
  sentiment: { reddit?: string; x?: string; news?: string };
  activeGraphNodeId?: string;
}): Phase2IntelBundle {
  const symbols = opts.opportunities.map((o) => String(o.symbol ?? "")).filter(Boolean);
  const signalGraph = buildSignalGraph({
    activeNodeId: opts.activeGraphNodeId,
    boostSymbols: symbols,
  });
  const probabilityViews = buildProbabilityViews(opts.opportunities);
  const consensusBreaks = detectConsensusBreaks(
    opts.opportunities,
    opts.sentiment,
    opts.marketConfidenceLabel
  );
  const connected = neighborsOf(signalGraph, signalGraph.activeNodeId)
    .slice(0, 5)
    .map((n) => n.node?.label ?? "")
    .filter(Boolean);
  const topTheme = probabilityViews.find((v) => v.id.startsWith("theme-"));
  const futureScenarios = simulateFuture({
    seedEvent: topTheme
      ? `What if “${topTheme.theme}” accelerates?`
      : undefined,
    horizon: topTheme?.timing ?? "30–90 days",
    connectedEffects: connected,
    topSymbols: symbols.slice(0, 3),
    baseProbability: topTheme?.probability ?? Number(opts.opportunities[0]?.confidence ?? 58),
  });
  const marketGenomes = buildMarketGenomes(opts.opportunities);

  return {
    signalGraph,
    probabilityViews,
    consensusBreaks,
    futureScenarios,
    marketGenomes,
  };
}

/** Attach probability enrichment onto opportunity rows (mutates copies). */
export function enrichOpportunitiesWithProbability(
  opportunities: FeedOpp[],
  views: ReturnType<typeof buildProbabilityViews>
) {
  return opportunities.map((o) => {
    const view = views.find((v) => v.id === `opp-${o.id ?? o.symbol}`);
    if (!view) return { ...o };
    return {
      ...o,
      probability: view.probability,
      modelConfidence: view.confidence,
      direction: view.direction,
      beneficiaries: view.beneficiaries,
      genomeThemes: views
        .filter((v) => v.id.startsWith("theme-"))
        .slice(0, 2)
        .map((v) => v.theme),
    };
  });
}
