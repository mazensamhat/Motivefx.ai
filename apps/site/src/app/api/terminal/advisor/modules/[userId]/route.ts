import { json } from "@/lib/api";
import {
  accessErrorResponse,
  assertUserMatch,
  requireTerminalSession,
} from "@/lib/terminal/auth";
import { MODULE_CATALOG, ANNUAL_PRICE_USD, BUNDLE_PRICE_USD } from "@/lib/terminal/modules-catalog";
import { isNativeIosAppStoreRequest } from "@/lib/terminal/ios-reader";
import { iosAppStoreReaderPlan, planForUser } from "@/lib/terminal/plan";
import { ensureSimTrial } from "@/lib/terminal/simulation";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;

  const { userId } = await ctx.params;
  try {
    assertUserMatch(auth.session, userId);
    // iOS App Store: never return web/Stripe paid entitlements (3.1.1 free reader).
    const plan = isNativeIosAppStoreRequest(req)
      ? iosAppStoreReaderPlan()
      : planForUser(auth.session.user);
    const simulation = await ensureSimTrial(auth.session.user);
    return json({
      active: plan.active,
      simulation,
      catalog: MODULE_CATALOG,
      hasAnnual: plan.hasAnnual,
      annualPrice: ANNUAL_PRICE_USD,
      bundlePrice: BUNDLE_PRICE_USD,
      tier: plan.tier,
      selectedMarkets: plan.selectedMarkets,
      allowedMarkets: plan.allowedMarkets,
      features: plan.features,
      entitlements: plan.entitlements,
    });
  } catch (err) {
    return accessErrorResponse(err);
  }
}
