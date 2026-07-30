import type { MarketGenome, GenomeTrait } from "./types";
import { neighborsOf, buildSignalGraph } from "./signal-graph";

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

const MODULE_THEMES: Record<string, string[]> = {
  trades: ["Options flow", "Equity volatility", "Institutional activity"],
  penny: ["Microcap liquidity", "Volume spikes", "Catalyst windows"],
  crypto: ["On-chain transfers", "Exchange flows", "24/7 narrative"],
  betting: ["Line movement", "Public vs sharp", "Odds context"],
  predictions: ["Event pricing", "Implied probability", "Category rotation"],
};

/**
 * Market Genome — compact trait map for a symbol/theme used by Opportunity Radar.
 */
export function buildMarketGenome(opp: FeedOpp): MarketGenome {
  const module = String(opp.module ?? "trades");
  const symbol = String(opp.symbol ?? "?");
  const conf = Number(opp.confidence ?? 60);

  const traits: GenomeTrait[] = [
    { key: "signal_strength", value: conf, source: "desk" },
    { key: "stance", value: String(opp.stance ?? opp.title ?? "hold"), source: "advisor" },
    { key: "risk", value: String(opp.riskLevel ?? "medium"), source: "desk" },
    { key: "scenario", value: String(opp.expectedMove ?? "n/a"), source: "model*" },
  ];

  for (const s of (opp.signals ?? []).slice(0, 4)) {
    traits.push({ key: "factor", value: s, source: "signals" });
  }

  const graph = buildSignalGraph({
    boostSymbols: [symbol],
    activeNodeId: module === "crypto" ? "ai" : module === "penny" ? "housing" : "rates",
  });
  const neigh = neighborsOf(graph, graph.activeNodeId)
    .slice(0, 4)
    .map((n) => n.node?.label ?? "")
    .filter(Boolean);

  return {
    symbol,
    module,
    traits,
    relatedThemes: MODULE_THEMES[module] ?? ["Market intelligence"],
    relatedNodes: neigh,
    updatedAt: new Date().toISOString(),
  };
}

export function buildMarketGenomes(opportunities: FeedOpp[]): MarketGenome[] {
  return opportunities.slice(0, 8).map(buildMarketGenome);
}

export function genomeForSymbol(opportunities: FeedOpp[], symbol: string): MarketGenome | null {
  const hit = opportunities.find(
    (o) => String(o.symbol).toUpperCase() === symbol.toUpperCase()
  );
  if (hit) return buildMarketGenome(hit);
  if (!symbol.trim()) return null;
  return buildMarketGenome({
    symbol,
    module: "trades",
    confidence: 55,
    title: "Watch",
    signals: ["Genome prior"],
    reasons: ["No live desk hit — showing prior genome traits only."],
    riskLevel: "medium",
  });
}
