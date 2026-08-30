/**
 * Creative Battles — score competing lanes; recommend + challenger.
 */

import type { CreativeBattleResult, ScoredHook } from "./types";

const LANE_LABEL: Record<string, string> = {
  A: "CONTRARIAN",
  B: "CURIOSITY",
  C: "PAIN",
  D: "DEMONSTRATION",
  E: "EDUCATIONAL",
  OTHER: "OTHER",
};

export function runCreativeBattle(scored: ScoredHook[]): CreativeBattleResult {
  const byLane = new Map<string, ScoredHook>();
  for (const hook of scored) {
    const lane = hook.battleLane;
    const prev = byLane.get(lane);
    if (!prev || hook.score.total > prev.score.total) byLane.set(lane, hook);
  }

  // Ensure we always have top overall even if lanes sparse
  const lanes = [...byLane.entries()]
    .map(([lane, hook]) => ({ lane: `${lane} — ${LANE_LABEL[lane] ?? lane}`, hook }))
    .sort((a, b) => b.hook.score.total - a.hook.score.total);

  const ranked = [...scored].sort((a, b) => b.score.total - a.score.total);
  const recommended = lanes[0]?.hook ?? ranked[0]!;
  const challenger =
    ranked.find((h) => h.id !== recommended.id && h.score.compliance >= 80) ?? null;

  return { lanes, recommended, challenger };
}
