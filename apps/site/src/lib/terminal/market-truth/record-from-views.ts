/**
 * G1/G2 — persist Motive Signal evidence to the in-process ledger when views are built.
 */
import type { ProbabilityView } from "@/lib/terminal/engines/types";
import { allowsDemoFeeds } from "./data-mode";
import { wrapMarketEvidence } from "./evidence";
import { recordSignalEvidence } from "./evidence-ledger";

type FeedOpp = { id?: string; symbol?: string; module?: string };

function resolveSymbol(view: ProbabilityView, opportunities: FeedOpp[]): string | undefined {
  const fromRelated = view.relatedSymbols?.find((s) => s.trim());
  if (fromRelated) return fromRelated.toUpperCase();
  const suffix = view.id.replace(/^opp-/, "");
  const hit = opportunities.find((o) => String(o.id ?? o.symbol ?? "") === suffix);
  return hit?.symbol ? String(hit.symbol).toUpperCase() : suffix ? suffix.toUpperCase() : undefined;
}

/** Record live opportunity views (`opp-*`) into the evidence ledger. */
export function recordProbabilityViewsToLedger(
  views: ProbabilityView[],
  opportunities: FeedOpp[] = []
): void {
  const demoMode = allowsDemoFeeds();

  for (const view of views) {
    if (!view.id.startsWith("opp-")) continue;
    const symbol = resolveSymbol(view, opportunities);
    if (!symbol) continue;

    const evidence = (view.factors ?? []).map((f) =>
      wrapMarketEvidence({
        id: `${view.id}-${f.key}`,
        value: { factor: f.key, label: f.label, score: f.score, weight: f.weight },
        sourceType: demoMode ? "DEMO" : "LIVE",
        provider: "motive-signal-engine",
        market: "stocks",
        symbol,
        group: "PRICE_MOMENTUM",
        confidence: f.score,
        signalContribution: Math.round(f.score * f.weight),
      })
    );

    recordSignalEvidence({
      symbol,
      motiveSignal: view.probability,
      evidence,
    });
  }
}
