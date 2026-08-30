/**
 * MotiveFX Creative Intelligence pipeline — full Ops milestone.
 */

import { buildCaption } from "./caption-architect";
import { runCreativeBattle } from "./battles";
import { runCreativeCritic } from "./creative-critic";
import { runFinancialClaimsCritic } from "./financial-claims-critic";
import { generateHooks } from "./hook-engine";
import { scoreHooks } from "./hook-scorer";
import { buildMarketStory } from "./market-story";
import { resolveApprovedMarketTruth } from "./market-truth-bridge";
import {
  adaptCaptionForPlatform,
  adaptVideoForPlatform,
  getPlatformIntel,
} from "./platform-intelligence";
import {
  CREATIVE_DOCTRINE,
  CREATIVE_POSITIONING,
  type CampaignBrief,
  type CreativeHypothesis,
  type CreativePipelineResult,
  type PlatformIntelSnapshot,
} from "./types";
import { buildVideoConcept } from "./video-engine";
import { buildVisualConcepts } from "./visual-hook";

export async function runCreativePipeline(
  briefInput: CampaignBrief
): Promise<CreativePipelineResult> {
  let brief = { ...briefInput };
  let marketTruthSource: CreativePipelineResult["marketTruthSource"] = null;

  if (brief.mode === "LIVE_MARKET") {
    if (!brief.marketTruth) {
      const resolved = await resolveApprovedMarketTruth(brief.symbol);
      if (resolved.ok) {
        brief = {
          ...brief,
          symbol: resolved.marketTruth.symbol,
          marketTruth: resolved.marketTruth,
        };
        marketTruthSource = resolved.source;
      } else {
        marketTruthSource = "none";
        brief = { ...brief, marketTruth: null };
      }
    } else {
      marketTruthSource = "provided";
    }
  }

  const hooks = scoreHooks(generateHooks(brief, 16), brief);
  const battle = runCreativeBattle(hooks);
  const marketStory = buildMarketStory(brief);
  const visuals = buildVisualConcepts(brief, marketStory);
  const videoBase = buildVideoConcept(brief, marketStory);
  const video = adaptVideoForPlatform(videoBase, brief.platform);
  const platformIntel = getPlatformIntel(brief.platform);
  const platform: PlatformIntelSnapshot = {
    aspectRatio: platformIntel.aspectRatio,
    maxCaptionChars: platformIntel.maxCaptionChars,
    videoMaxSec: platformIntel.videoMaxSec,
    notes: platformIntel.notes,
    safeZones: platformIntel.safeZones,
    ctaPlacement: platformIntel.ctaPlacement,
  };

  const finalists = [battle.recommended, battle.challenger].filter(
    (h): h is NonNullable<typeof h> => Boolean(h)
  );

  const hypotheses: CreativeHypothesis[] = finalists.map((hook, idx) => {
    const captionRaw = buildCaption(hook, marketStory, brief);
    const captionAdapted = adaptCaptionForPlatform(captionRaw, brief.platform);
    const caption = {
      hook: captionAdapted.hook,
      traderRecognition: captionAdapted.traderRecognition,
      marketTension: captionAdapted.marketTension,
      evidence: captionAdapted.evidence,
      motiveReveal: captionAdapted.motiveReveal,
      insight: captionAdapted.insight,
      cta: captionAdapted.cta,
      fullCaption: captionAdapted.fullCaption,
    };
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
    if (brief.mode === "LIVE_MARKET" && !brief.marketTruth) {
      blockReasons.push(
        "LIVE_MARKET requires approved Market Truth from ledger or durable snapshots."
      );
    }
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

  const top = battle.recommended;
  for (const visual of visuals.slice(0, 3)) {
    if (hypotheses.some((h) => h.visual.id === visual.id && h.hook.id === top.id)) continue;
    const captionRaw = buildCaption(top, marketStory, brief);
    const captionAdapted = adaptCaptionForPlatform(captionRaw, brief.platform);
    const caption = {
      hook: captionAdapted.hook,
      traderRecognition: captionAdapted.traderRecognition,
      marketTension: captionAdapted.marketTension,
      evidence: captionAdapted.evidence,
      motiveReveal: captionAdapted.motiveReveal,
      insight: captionAdapted.insight,
      cta: captionAdapted.cta,
      fullCaption: captionAdapted.fullCaption,
    };
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
    if (brief.mode === "LIVE_MARKET" && !brief.marketTruth) {
      blockReasons.push(
        "LIVE_MARKET requires approved Market Truth from ledger or durable snapshots."
      );
    }
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
    marketTruthSource,
    platform,
    hypotheses,
    approvalReady: hypotheses.filter((h) => !h.publishBlocked),
    blocked: hypotheses.filter((h) => h.publishBlocked),
  };
}

export * from "./types";
