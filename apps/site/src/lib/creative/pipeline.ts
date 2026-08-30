/**
 * MotiveFX Creative Intelligence pipeline — first production milestone.
 */

import { buildCaption } from "./caption-architect";
import { runCreativeBattle } from "./battles";
import { runCreativeCritic } from "./creative-critic";
import { runFinancialClaimsCritic } from "./financial-claims-critic";
import { generateHooks } from "./hook-engine";
import { scoreHooks } from "./hook-scorer";
import { buildMarketStory } from "./market-story";
import {
  CREATIVE_DOCTRINE,
  CREATIVE_POSITIONING,
  type CampaignBrief,
  type CreativeHypothesis,
  type CreativePipelineResult,
} from "./types";
import { buildVideoConcept } from "./video-engine";
import { buildVisualConcepts } from "./visual-hook";

export function runCreativePipeline(brief: CampaignBrief): CreativePipelineResult {
  if (brief.mode === "LIVE_MARKET" && !brief.marketTruth) {
    // Soft-fail into evergreen story but mark hooks; financial critic will block publish.
    brief = { ...brief, marketTruth: null };
  }

  const hooks = scoreHooks(generateHooks(brief, 16), brief);
  const battle = runCreativeBattle(hooks);
  const marketStory = buildMarketStory(brief);
  const visuals = buildVisualConcepts(brief, marketStory);
  const video = buildVideoConcept(brief, marketStory);

  const finalists = [battle.recommended, battle.challenger].filter(
    (h): h is NonNullable<typeof h> => Boolean(h)
  );

  const hypotheses: CreativeHypothesis[] = finalists.map((hook, idx) => {
    const caption = buildCaption(hook, marketStory, brief);
    const visual = visuals[idx % visuals.length]!;
    const creativeCritic = runCreativeCritic({ hook, caption, visual, video });
    const financialClaimsCritic = runFinancialClaimsCritic({
      brief,
      hook,
      caption,
      visual,
      story: marketStory,
    });
    const blockReasons = [
      ...creativeCritic.findings.filter((f) => f.severity === "block").map((f) => f.message),
      ...financialClaimsCritic.findings.filter((f) => f.severity === "block").map((f) => f.message),
    ];
    const publishBlocked = blockReasons.length > 0 || !financialClaimsCritic.pass;

    return {
      id: `hyp_${hook.id}`,
      label: idx === 0 ? "RECOMMENDED" : "CHALLENGER",
      hook,
      caption,
      visual,
      video,
      creativeCritic,
      financialClaimsCritic,
      publishBlocked,
      blockReasons,
    };
  });

  // Extra visual variants as hypotheses from top hook
  const top = battle.recommended;
  for (const visual of visuals.slice(0, 3)) {
    if (hypotheses.some((h) => h.visual.id === visual.id && h.hook.id === top.id)) continue;
    const caption = buildCaption(top, marketStory, brief);
    const creativeCritic = runCreativeCritic({ hook: top, caption, visual, video });
    const financialClaimsCritic = runFinancialClaimsCritic({
      brief,
      hook: top,
      caption,
      visual,
      story: marketStory,
    });
    const blockReasons = [
      ...creativeCritic.findings.filter((f) => f.severity === "block").map((f) => f.message),
      ...financialClaimsCritic.findings.filter((f) => f.severity === "block").map((f) => f.message),
    ];
    hypotheses.push({
      id: `hyp_${top.id}_${visual.id}`,
      label: `VARIANT · ${visual.id}`,
      hook: top,
      caption,
      visual,
      video,
      creativeCritic,
      financialClaimsCritic,
      publishBlocked: blockReasons.length > 0 || !financialClaimsCritic.pass,
      blockReasons,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    doctrine: CREATIVE_DOCTRINE,
    positioning: CREATIVE_POSITIONING,
    brief,
    hooks,
    battle,
    marketStory,
    hypotheses,
    approvalReady: hypotheses.filter((h) => !h.publishBlocked),
    blocked: hypotheses.filter((h) => h.publishBlocked),
  };
}

export * from "./types";
