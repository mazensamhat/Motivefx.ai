import type { FutureSimResult, ScenarioBranch } from "./types";

const DISCLAIMER =
  "Educational scenario branches only — not forecasts, price targets, or financial advice.";

const HORIZON_PRESETS = ["7 days", "30 days", "30–90 days", "6–12 months"] as const;

/**
 * Phase 3 Future Simulator — user seed/horizon, richer branches, light ensemble note.
 */
export function simulateFuture(opts: {
  seedEvent?: string;
  horizon?: string;
  connectedEffects?: string[];
  topSymbols?: string[];
  baseProbability?: number;
  pathCount?: number;
  aggressiveness?: "conservative" | "base" | "aggressive";
}): FutureSimResult {
  const seed =
    opts.seedEvent?.trim() ||
    (opts.topSymbols?.[0]
      ? `What if $${opts.topSymbols[0]} volatility expands this week?`
      : "What if interest-rate expectations reprice over the next quarter?");
  const horizonRaw = opts.horizon?.trim() || "30–90 days";
  const horizon = HORIZON_PRESETS.includes(horizonRaw as (typeof HORIZON_PRESETS)[number])
    ? horizonRaw
    : horizonRaw;
  const effects =
    opts.connectedEffects && opts.connectedEffects.length > 0
      ? opts.connectedEffects
      : ["Banks", "Housing", "Consumer Spending", "Retail"];
  let base = Math.min(78, Math.max(42, Math.round(opts.baseProbability ?? 58)));
  if (opts.aggressiveness === "conservative") base = Math.max(42, base - 8);
  if (opts.aggressiveness === "aggressive") base = Math.min(82, base + 8);

  // Longer horizons widen uncertainty → slightly lower base, fatter tails
  if (horizon.includes("6–12") || horizon.toLowerCase().includes("year")) {
    base = Math.max(40, base - 5);
  } else if (horizon.includes("7 day")) {
    base = Math.min(80, base + 4);
  }

  const pathCount = Math.min(500, Math.max(21, opts.pathCount ?? 81));
  const accelShare = Math.max(12, Math.round((100 - base) * 0.45));
  const fadeShare = Math.max(10, 100 - base - accelShare);

  const branches: ScenarioBranch[] = [
    {
      id: "base",
      label: "Base case — gradual transmission",
      probability: base,
      effects: [
        `${effects[0]} absorbs the first-order move over ${horizon}.`,
        `${effects[1] ?? "Adjacent sector"} sees lagged second-order pressure.`,
        opts.topSymbols?.[0]
          ? `$${opts.topSymbols[0]} stays on Opportunity Radar for confirmation.`
          : "Opportunity Radar watches for confirmation signals.",
        effects[3] ? `${effects[3]} appears as a third-order watch item.` : "Cross-market edges stay elevated.",
      ],
      invalidators: ["Sharp policy reversal", "Liquidity shock outside the modeled path"],
    },
    {
      id: "accelerate",
      label: "Acceleration — cascade compresses",
      probability: accelShare,
      effects: [
        `Third-order effects hit ${effects[2] ?? "downstream industries"} faster than consensus.`,
        "Consensus Break divergence rises as headlines lag the Signal Graph.",
        "Daily Brief prioritizes beneficiaries and risk lenses.",
        "Probability Engine confidence rises if desk corroboration continues.",
      ],
      invalidators: ["Demand destruction caps the cascade", "Regulatory intervention"],
    },
    {
      id: "fade",
      label: "Fade — signal mean-reverts",
      probability: fadeShare,
      effects: [
        "Initial move fades; Relationship Engine edge weights cool.",
        "Probability Engine confidence decays without fresh evidence.",
        "Simulator keeps the seed on a theme watchlist, not an active thesis.",
        "Custom alerts stay armed for a re-acceleration print.",
      ],
      invalidators: ["Fresh confirming flow / volume", "Macro surprise extends the theme"],
    },
  ];

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
    pathCount,
    ensembleNote: `Illustrative ensemble of ${pathCount} paths over ${horizon} — not a Monte Carlo forecast of returns.`,
  };
}

export const SIM_HORIZON_PRESETS = [...HORIZON_PRESETS];
