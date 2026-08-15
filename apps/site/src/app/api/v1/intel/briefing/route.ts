import { json, unauthorized } from "@/lib/api";
import { resolveApiKeyBearer } from "@/lib/terminal/institutional";
import { hasFeature, planForUser } from "@/lib/terminal/plan";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { enforceApiRateLimit, withRateLimitHeaders } from "@/lib/terminal/api-metering";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Phase 4 public intel API — Bearer mfx_… key (Ultra+ api_access).
 * GET /api/v1/intel/briefing
 *
 * Entitlement is based on the key owner's subscription (planForUser), not the
 * caller's User-Agent — so iOS free-reader UA must not strip web Ultra+ API access.
 */
export async function GET(request: Request) {
  const row = await resolveApiKeyBearer(request.headers.get("authorization"));
  if (!row?.user) return unauthorized("Invalid or revoked API key");

  const plan = planForUser(row.user);
  if (!hasFeature(plan, "api_access")) {
    return unauthorized("API access requires Ultra+ or Elite");
  }

  const meter = await enforceApiRateLimit({
    userId: row.user.id,
    apiKeyId: row.id,
    tier: plan.tier,
    endpoint: "/api/v1/intel/briefing",
  });
  if (!meter.ok) return meter.response;

  const briefing = await buildHomeBriefing({
    displayName: row.user.displayName ?? row.user.email.split("@")[0],
    userId: row.user.id,
    plan,
  });

  return withRateLimitHeaders(
    json({
      ok: true,
      generatedAt: briefing.generatedAt,
      marketConfidence: briefing.marketConfidence,
      motivfxScore: briefing.motivfxScore,
      biggestOpportunity: briefing.biggestOpportunity,
      biggestRisk: briefing.biggestRisk,
      opportunityCount: briefing.opportunityCount,
      opportunities: ((briefing.opportunities as unknown[]) ?? []).slice(0, 8),
      probabilityViews: briefing.probabilityViews ?? [],
      consensusBreaks: briefing.consensusBreaks ?? [],
      rateLimit: { limit: meter.limit, remaining: meter.remaining },
      disclaimer: "Informational market intelligence only — not financial advice.",
    }),
    { remaining: meter.remaining, limit: meter.limit }
  );
}
