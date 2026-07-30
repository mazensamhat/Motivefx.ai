import type { FutureSimResult, ScenarioBranch } from "./types";

const DISCLAIMER =
  "Educational scenario branches only — not forecasts, price targets, or financial advice.";

/**
 * Future Simulator — expands a seed event into probability-weighted branches
 * using Relationship Engine neighbors + live opportunity context.
 */
export function simulateFuture(opts: {
  seedEvent?: string;
  horizon?: string;
  connectedEffects?: string[];
  topSymbols?: string[];
  baseProbability?: number;
}): FutureSimResult {
  const seed =
    opts.seedEvent?.trim() ||
    (opts.topSymbols?.[0]
      ? `What if $${opts.topSymbols[0]} volatility expands this week?`
      : "What if interest-rate expectations reprice over the next quarter?");
  const horizon = opts.horizon?.trim() || "30–90 days";
  const effects =
    opts.connectedEffects && opts.connectedEffects.length > 0
      ? opts.connectedEffects
      : ["Banks", "Housing", "Consumer Spending", "Retail"];
  const base = Math.min(78, Math.max(42, Math.round(opts.baseProbability ?? 58)));

  const branches: ScenarioBranch[] = [
    {
      id: "base",
      label: "Base case — gradual transmission",
      probability: base,
      effects: [
        `${effects[0]} absorbs the first-order move.`,
        `${effects[1] ?? "Adjacent sector"} sees lagged second-order pressure.`,
        opts.topSymbols?.[0]
          ? `$${opts.topSymbols[0]} stays on Opportunity Radar for confirmation.`
          : "Opportunity Radar watches for confirmation signals.",
      ],
      invalidators: ["Sharp policy reversal", "Liquidity shock outside the modeled path"],
    },
    {
      id: "accelerate",
      label: "Acceleration — cascade compresses",
      probability: Math.max(12, Math.round((100 - base) * 0.45)),
      effects: [
        `Third-order effects hit ${effects[2] ?? "downstream industries"} faster than consensus.`,
        "Consensus Break score rises as headlines lag the signal graph.",
        "Daily Brief prioritizes beneficiaries and risk lenses.",
      ],
      invalidators: ["Demand destruction caps the cascade", "Regulatory intervention"],
    },
    {
      id: "fade",
      label: "Fade — signal mean-reverts",
      probability: Math.max(10, 100 - base - Math.max(12, Math.round((100 - base) * 0.45))),
      effects: [
        "Initial move fades; Relationship Engine edges cool.",
        "Probability Engine confidence decays without fresh evidence.",
        "Simulator keeps the seed on a watchlist, not an active thesis.",
      ],
      invalidators: ["Fresh confirming flow / volume", "Macro surprise extends the theme"],
    },
  ];

  // Normalize to ~100
  const sum = branches.reduce((s, b) => s + b.probability, 0) || 1;
  for (const b of branches) {
    b.probability = Math.round((b.probability / sum) * 100);
  }
  const drift = 100 - branches.reduce((s, b) => s + b.probability, 0);
  branches[0].probability += drift;

  return {
    seedEvent: seed,
    horizon,
    branches,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}
