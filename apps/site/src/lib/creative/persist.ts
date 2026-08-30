/**
 * Persist Creative Lab runs + performance events; derive learning insights.
 */

import { prisma } from "@motivefx/database";
import type { CreativePipelineResult } from "./types";

export async function persistCreativeRun(input: {
  result: CreativePipelineResult;
  actorEmail: string;
}): Promise<{ runId: string }> {
  const { result, actorEmail } = input;
  const brief = result.brief;
  try {
    const run = await prisma.creativeCampaignRun.create({
      data: {
        objective: brief.objective,
        trader: brief.trader,
        angle: brief.angle,
        mode: brief.mode,
        platform: brief.platform,
        symbol: brief.symbol,
        briefJson: JSON.stringify(brief),
        recommendedHook: result.battle.recommended.text,
        recommendedScore: result.battle.recommended.score.total,
        approvalReady: result.approvalReady.length,
        blockedCount: result.blocked.length,
        resultJson: JSON.stringify({
          generatedAt: result.generatedAt,
          marketStory: result.marketStory,
          hookIds: result.hooks.map((h) => h.id),
        }),
        createdBy: actorEmail,
        hypotheses: {
          create: result.hypotheses.slice(0, 8).map((h) => ({
            label: h.label,
            hookFamily: h.hook.family,
            hookText: h.hook.text,
            hookScore: h.hook.score.total,
            visualStrategy: h.visual.id,
            videoOpening: h.video.beats[0]?.voiceOrSuper ?? null,
            captionPreview: h.caption.fullCaption.slice(0, 500),
            publishBlocked: h.publishBlocked,
            approved: !h.publishBlocked && h.label === "RECOMMENDED",
            payloadJson: JSON.stringify({
              creativeCritic: h.creativeCritic.score,
              claimsCritic: h.financialClaimsCritic.score,
              blockReasons: h.blockReasons,
            }),
          })),
        },
      },
    });
    return { runId: run.id };
  } catch (e) {
    console.warn("[creative/persist] run failed", e);
    return { runId: "" };
  }
}

export type PerformanceInput = {
  runId?: string;
  hypothesisId?: string;
  platform: string;
  traderPersona?: string;
  hookFamily?: string;
  visualStrategy?: string;
  videoOpening?: string;
  captionStructure?: string;
  productFeature?: string;
  cta?: string;
  impressions?: number;
  hold3s?: number;
  watchTimeSec?: number;
  clicks?: number;
  landings?: number;
  signups?: number;
  activations?: number;
  paid?: number;
  notes?: string;
  createdBy?: string;
};

export async function recordCreativePerformance(input: PerformanceInput) {
  try {
    return await prisma.creativePerformanceEvent.create({
      data: {
        runId: input.runId || undefined,
        hypothesisId: input.hypothesisId || undefined,
        platform: input.platform,
        traderPersona: input.traderPersona,
        hookFamily: input.hookFamily,
        visualStrategy: input.visualStrategy,
        videoOpening: input.videoOpening,
        captionStructure: input.captionStructure,
        productFeature: input.productFeature,
        cta: input.cta,
        impressions: input.impressions ?? 0,
        hold3s: input.hold3s ?? 0,
        watchTimeSec: input.watchTimeSec ?? 0,
        clicks: input.clicks ?? 0,
        landings: input.landings ?? 0,
        signups: input.signups ?? 0,
        activations: input.activations ?? 0,
        paid: input.paid ?? 0,
        notes: input.notes,
        createdBy: input.createdBy,
      },
    });
  } catch (e) {
    console.warn("[creative/persist] performance failed", e);
    return null;
  }
}

export type LearningInsight = {
  id: string;
  statement: string;
  confidence: "low" | "medium" | "high";
  sampleSize: number;
  metric: string;
};

function rate(num: number, den: number) {
  if (den <= 0) return 0;
  return num / den;
}

export async function buildCreativeLearningInsights(): Promise<{
  generatedAt: string;
  insights: LearningInsight[];
  totals: { events: number; impressions: number; signups: number };
}> {
  try {
    const events = await prisma.creativePerformanceEvent.findMany({
      orderBy: { recordedAt: "desc" },
      take: 500,
    });

    const totals = {
      events: events.length,
      impressions: events.reduce((s, e) => s + e.impressions, 0),
      signups: events.reduce((s, e) => s + e.signups, 0),
    };

    const insights: LearningInsight[] = [];

    // Hook family hold rate
    const byFamily = new Map<string, { imp: number; hold: number; clicks: number; signups: number; n: number }>();
    for (const e of events) {
      const key = e.hookFamily || "unknown";
      const cur = byFamily.get(key) ?? { imp: 0, hold: 0, clicks: 0, signups: 0, n: 0 };
      cur.imp += e.impressions;
      cur.hold += e.hold3s;
      cur.clicks += e.clicks;
      cur.signups += e.signups;
      cur.n += 1;
      byFamily.set(key, cur);
    }

    const familyRanks = [...byFamily.entries()]
      .filter(([, v]) => v.imp >= 50)
      .map(([family, v]) => ({
        family,
        holdRate: rate(v.hold, v.imp),
        ctr: rate(v.clicks, v.imp),
        signupRate: rate(v.signups, v.imp),
        n: v.n,
      }))
      .sort((a, b) => b.holdRate - a.holdRate);

    if (familyRanks[0] && familyRanks.length >= 2) {
      insights.push({
        id: "hook-family-hold",
        statement: `${familyRanks[0].family} hooks lead 3-second hold (${Math.round(familyRanks[0].holdRate * 1000) / 10}% vs peers).`,
        confidence: familyRanks[0].n >= 5 ? "high" : "medium",
        sampleSize: familyRanks[0].n,
        metric: "3s_hold",
      });
    }

    // WAIT / demonstration vs generic AI messaging proxy
    const demo = byFamily.get("demonstration");
    const ai = byFamily.get("ai_misconception");
    if (demo && ai && demo.imp >= 30 && ai.imp >= 30) {
      const demoSignup = rate(demo.signups, demo.imp);
      const aiSignup = rate(ai.signups, ai.imp);
      if (demoSignup > aiSignup) {
        insights.push({
          id: "demo-vs-ai",
          statement:
            "Demonstration hooks outperform AI-misconception messaging on signup rate for measured traffic.",
          confidence: "medium",
          sampleSize: demo.n + ai.n,
          metric: "signup_rate",
        });
      }
    }

    // Visual strategy
    const byVisual = new Map<string, { imp: number; hold: number; n: number }>();
    for (const e of events) {
      const key = e.visualStrategy || "unknown";
      const cur = byVisual.get(key) ?? { imp: 0, hold: 0, n: 0 };
      cur.imp += e.impressions;
      cur.hold += e.hold3s;
      cur.n += 1;
      byVisual.set(key, cur);
    }
    const visualRanks = [...byVisual.entries()]
      .filter(([, v]) => v.imp >= 40)
      .map(([visual, v]) => ({ visual, holdRate: rate(v.hold, v.imp), n: v.n }))
      .sort((a, b) => b.holdRate - a.holdRate);
    if (visualRanks[0]?.visual === "confluence" || visualRanks[0]?.visual === "conflicting_evidence") {
      insights.push({
        id: "visual-confluence",
        statement: `${visualRanks[0].visual} visuals produce stronger hold rates than generic chart treatments in current data.`,
        confidence: visualRanks[0].n >= 4 ? "medium" : "low",
        sampleSize: visualRanks[0].n,
        metric: "3s_hold",
      });
    }

    // WAIT creatives (video opening)
    const waitEvents = events.filter((e) => /wait/i.test(e.videoOpening ?? "") || /wait/i.test(e.cta ?? ""));
    const buyEvents = events.filter((e) => /\bbuy\b/i.test(e.videoOpening ?? ""));
    const waitImp = waitEvents.reduce((s, e) => s + e.impressions, 0);
    const buyImp = buyEvents.reduce((s, e) => s + e.impressions, 0);
    if (waitImp >= 40 && buyImp >= 40) {
      const waitSignup = rate(
        waitEvents.reduce((s, e) => s + e.signups, 0),
        waitImp
      );
      const buySignup = rate(
        buyEvents.reduce((s, e) => s + e.signups, 0),
        buyImp
      );
      if (waitSignup >= buySignup) {
        insights.push({
          id: "wait-vs-buy",
          statement:
            "“WAIT” creatives match or beat “BUY?”-led creatives on signup quality in current samples.",
          confidence: "medium",
          sampleSize: waitEvents.length + buyEvents.length,
          metric: "signup_rate",
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        id: "seed",
        statement:
          "Not enough performance events yet. Log impressions → 3s hold → CTR → signup after publish to unlock learning.",
        confidence: "low",
        sampleSize: events.length,
        metric: "coverage",
      });
      insights.push({
        id: "doctrine",
        statement:
          "Prior: Demonstration and WAIT creatives should outperform generic AI-prediction ads for trust and signup quality.",
        confidence: "low",
        sampleSize: 0,
        metric: "prior",
      });
    }

    return { generatedAt: new Date().toISOString(), insights, totals };
  } catch (e) {
    console.warn("[creative/learning] failed", e);
    return {
      generatedAt: new Date().toISOString(),
      insights: [
        {
          id: "unavailable",
          statement: "Learning store unavailable — check database connectivity.",
          confidence: "low",
          sampleSize: 0,
          metric: "error",
        },
      ],
      totals: { events: 0, impressions: 0, signups: 0 },
    };
  }
}

export async function listRecentCreativeRuns(limit = 20) {
  try {
    return await prisma.creativeCampaignRun.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { hypotheses: { take: 4 } },
    });
  } catch {
    return [];
  }
}
