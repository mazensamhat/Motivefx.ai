import { requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import {
  runCreativePipeline,
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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
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
      "≥10 hooks · scored finalists · caption + visual + first-3s · Creative Critic + Financial Claims Critic · hypotheses before approval",
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as Partial<CampaignBrief> & {
      marketTruth?: CampaignBrief["marketTruth"];
    };

    if (!body.objective || !OBJECTIVES.includes(body.objective)) {
      return badRequest("objective required");
    }
    if (!body.trader || !TRADERS.includes(body.trader)) return badRequest("trader required");
    if (!body.angle || !ANGLES.includes(body.angle)) return badRequest("angle required");
    if (!body.mode || !MODES.includes(body.mode)) return badRequest("mode required");
    if (!body.platform || !PLATFORMS.includes(body.platform)) {
      return badRequest("platform required");
    }

    if (body.mode === "LIVE_MARKET") {
      if (!body.marketTruth?.symbol || !body.marketTruth.truthClass) {
        return badRequest("LIVE_MARKET requires marketTruth.symbol and truthClass");
      }
      const tc = body.marketTruth.truthClass as TruthClass;
      if (!["LIVE", "DELAYED", "HISTORICAL", "SIMULATED", "DEMO"].includes(tc)) {
        return badRequest("invalid marketTruth.truthClass");
      }
    }

    const brief: CampaignBrief = {
      objective: body.objective,
      trader: body.trader,
      angle: body.angle,
      mode: body.mode,
      platform: body.platform,
      symbol: body.symbol,
      featureFocus: body.featureFocus,
      marketTruth: body.mode === "LIVE_MARKET" ? body.marketTruth ?? null : null,
    };

    const result = runCreativePipeline(brief);

    recordAudit({
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      action: "ops.creative.pipeline",
      targetType: "creative_campaign",
      targetId: `${brief.mode}:${brief.platform}`,
      result: "success",
      after: {
        hooks: result.hooks.length,
        approvalReady: result.approvalReady.length,
        blocked: result.blocked.length,
        recommendedScore: result.battle.recommended.score.total,
      },
    });

    return json(result);
  } catch (error) {
    console.error("[admin/creative]", error);
    return serverError("Could not run creative pipeline");
  }
}
