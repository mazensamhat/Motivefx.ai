import { buildSignalGraph, neighborsOf } from "./signal-graph";
import { buildProbabilityViews } from "./probability";
import { detectConsensusBreaks, getConsensusHistory } from "./consensus-break";
import { simulateFuture } from "./future-simulator";
import { buildMarketGenomes } from "./market-genome";
import { suggestThemes } from "./predictive";
import type { IntelPrefs, Phase2IntelBundle } from "./types";

export * from "./types";
export { buildSignalGraph, neighborsOf } from "./signal-graph";
export { buildProbabilityViews, probabilityEnrichment } from "./probability";
export { detectConsensusBreaks, getConsensusHistory } from "./consensus-break";
export { simulateFuture, SIM_HORIZON_PRESETS } from "./future-simulator";
export { buildMarketGenomes, buildMarketGenome, genomeForSymbol } from "./market-genome";
export {
  DEFAULT_INTEL_PREFS,
  normalizePrefs,
  suggestThemes,
  evaluateSignalAlertRules,
} from "./predictive";

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
 * Run Phase 2/3 engines against Opportunity Radar + optional user prefs.
 */
export function runPhase2Engines(opts: {
  opportunities: FeedOpp[];
  marketConfidenceLabel: string;
  sentiment: { reddit?: string; x?: string; news?: string };
  activeGraphNodeId?: string;
  prefs?: IntelPrefs | null;
}): Phase2IntelBundle {
  const symbols = opts.opportunities.map((o) => String(o.symbol ?? "")).filter(Boolean);
  const signalGraph = buildSignalGraph({
    activeNodeId: opts.activeGraphNodeId,
    boostSymbols: symbols,
  });
  const probabilityViews = buildProbabilityViews(opts.opportunities, opts.sentiment);
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
    seedEvent: topTheme ? `What if “${topTheme.theme}” accelerates?` : undefined,
    horizon: topTheme?.timing ?? "30–90 days",
    connectedEffects: connected,
    topSymbols: symbols.slice(0, 3),
    baseProbability: topTheme?.probability ?? Number(opts.opportunities[0]?.confidence ?? 58),
    pathCount: 81,
  });
  const marketGenomes = buildMarketGenomes(opts.opportunities);
  const themeSuggestions = suggestThemes(
    probabilityViews,
    opts.prefs?.themeWatchlist ?? []
  );

  return {
    signalGraph,
    probabilityViews,
    consensusBreaks,
    consensusHistory: getConsensusHistory(),
    futureScenarios,
    marketGenomes,
    themeSuggestions,
  };
}

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
      factors: view.factors,
      deltaVsPrior: view.deltaVsPrior,
      genomeThemes: views
        .filter((v) => v.id.startsWith("theme-"))
        .slice(0, 2)
        .map((v) => v.theme),
    };
  });
}
