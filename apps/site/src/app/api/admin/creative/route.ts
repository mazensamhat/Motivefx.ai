import { requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import {
  buildCreativeLearningInsights,
  listRecentCreativeRuns,
  persistCreativeRun,
  recordCreativePerformance,
  resolveApprovedMarketTruth,
  runCreativePipeline,
  getPlatformIntel,
  type CampaignBrief,
  type CreativeAngle,
  type CreativeMode,
  type CreativeObjective,
  type CreativePlatform,
  type TraderPersona,
  type TruthClass,
} from "@/lib/creative";
import { recordAudit } from "@/lib/ops/audit";

const OBJECTIVES: CreativeObjective[] = [
  "awareness",
  "product_education",
  "signup",
  "trial",
  "feature_adoption",
];
const TRADERS: TraderPersona[] = [
  "beginner",
  "intermediate",
  "experienced",
  "technical",
  "overtrader",
  "signal_seeker",
];
const ANGLES: CreativeAngle[] = [
  "evidence",
  "confluence",
  "confidence",
  "market_truth",
  "ai_explanation",
  "timing",
  "risk_awareness",
];
const MODES: CreativeMode[] = ["EVERGREEN", "MARKET_AWARE", "LIVE_MARKET"];
const PLATFORMS: CreativePlatform[] = [
  "tiktok",
  "reels",
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "youtube_shorts",
];

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "meta";
  const symbol = url.searchParams.get("symbol")?.trim();

  try {
    if (view === "learning") {
      return json(await buildCreativeLearningInsights());
    }
    if (view === "runs") {
      const runs = await listRecentCreativeRuns(25);
      return json({ generatedAt: new Date().toISOString(), runs });
    }
    if (view === "truth") {
      const resolved = await resolveApprovedMarketTruth(symbol || undefined);
      return json({ generatedAt: new Date().toISOString(), resolved });
    }
    if (view === "platform") {
      const platform = (url.searchParams.get("platform") ?? "reels") as CreativePlatform;
      if (!PLATFORMS.includes(platform)) return badRequest("invalid platform");
      return json({ platform: getPlatformIntel(platform) });
    }

    return json({
      doctrine: "Don't advertise a prediction. Advertise the intelligence behind the decision.",
      positioning: "Don't sell “AI trading.” Sell clarity when the market is noisy.",
      options: {
        objectives: OBJECTIVES,
        traders: TRADERS,
        angles: ANGLES,
        modes: MODES,
        platforms: PLATFORMS,
      },
      milestone:
        "Hooks → score → Market Truth → caption/visual/video → dual critics → persist → learning",
    });
  } catch (error) {
    console.error("[admin/creative GET]", error);
    return serverError("Could not load creative intel");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "pipeline";

    if (action === "performance") {
      const platform = String(body.platform ?? "");
      if (!platform) return badRequest("platform required");
      const row = await recordCreativePerformance({
        runId: typeof body.runId === "string" ? body.runId : undefined,
        hypothesisId: typeof body.hypothesisId === "string" ? body.hypothesisId : undefined,
        platform,
        traderPersona: typeof body.traderPersona === "string" ? body.traderPersona : undefined,
        hookFamily: typeof body.hookFamily === "string" ? body.hookFamily : undefined,
        visualStrategy: typeof body.visualStrategy === "string" ? body.visualStrategy : undefined,
        videoOpening: typeof body.videoOpening === "string" ? body.videoOpening : undefined,
        captionStructure:
          typeof body.captionStructure === "string" ? body.captionStructure : undefined,
        productFeature: typeof body.productFeature === "string" ? body.productFeature : undefined,
        cta: typeof body.cta === "string" ? body.cta : undefined,
        impressions: Number(body.impressions ?? 0),
        hold3s: Number(body.hold3s ?? 0),
        watchTimeSec: Number(body.watchTimeSec ?? 0),
        clicks: Number(body.clicks ?? 0),
        landings: Number(body.landings ?? 0),
        signups: Number(body.signups ?? 0),
        activations: Number(body.activations ?? 0),
        paid: Number(body.paid ?? 0),
        notes: typeof body.notes === "string" ? body.notes : undefined,
        createdBy: auth.session.email,
      });
      recordAudit({
        actorId: auth.session.id,
        actorEmail: auth.session.email,
        action: "ops.creative.performance",
        targetType: "creative_performance",
        targetId: row?.id ?? "failed",
        result: row ? "success" : "error",
      });
      return json({ ok: Boolean(row), id: row?.id ?? null });
    }

    if (!body.objective || !OBJECTIVES.includes(body.objective as CreativeObjective)) {
      return badRequest("objective required");
    }
    if (!body.trader || !TRADERS.includes(body.trader as TraderPersona)) {
      return badRequest("trader required");
    }
    if (!body.angle || !ANGLES.includes(body.angle as CreativeAngle)) {
      return badRequest("angle required");
    }
    if (!body.mode || !MODES.includes(body.mode as CreativeMode)) {
      return badRequest("mode required");
    }
    if (!body.platform || !PLATFORMS.includes(body.platform as CreativePlatform)) {
      return badRequest("platform required");
    }

    const mode = body.mode as CreativeMode;
    let marketTruth = (body.marketTruth as CampaignBrief["marketTruth"]) ?? null;

    if (mode === "LIVE_MARKET" && marketTruth) {
      const tc = marketTruth.truthClass as TruthClass;
      if (!marketTruth.symbol || !tc) {
        return badRequest("marketTruth.symbol and truthClass required when provided");
      }
    }

    const brief: CampaignBrief = {
      objective: body.objective as CreativeObjective,
      trader: body.trader as TraderPersona,
      angle: body.angle as CreativeAngle,
      mode,
      platform: body.platform as CreativePlatform,
      symbol: typeof body.symbol === "string" ? body.symbol : undefined,
      featureFocus: typeof body.featureFocus === "string" ? body.featureFocus : undefined,
      // LIVE_MARKET without body resolves from ledger/durable inside pipeline
      marketTruth: mode === "LIVE_MARKET" ? marketTruth : null,
    };

    const result = await runCreativePipeline(brief);
    const { runId } = await persistCreativeRun({
      result,
      actorEmail: auth.session.email,
    });

    recordAudit({
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      action: "ops.creative.pipeline",
      targetType: "creative_campaign",
      targetId: runId || `${brief.mode}:${brief.platform}`,
      result: "success",
      after: {
        hooks: result.hooks.length,
        approvalReady: result.approvalReady.length,
        blocked: result.blocked.length,
        recommendedScore: result.battle.recommended.score.total,
        marketTruthSource: result.marketTruthSource,
      },
    });

    return json({ ...result, runId: runId || undefined });
  } catch (error) {
    console.error("[admin/creative]", error);
    return serverError("Could not run creative pipeline");
  }
}
