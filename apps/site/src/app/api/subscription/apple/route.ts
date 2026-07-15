import { z } from "zod";
import { getSession } from "@/lib/session";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import {
  activateAppleSubscription,
  deactivateAppleSubscription,
  tierFromAppleProductId,
  tierFromEntitlementId,
} from "@/lib/apple-iap";
import type { IntelligenceMarketId, PricingTierId } from "@/lib/tiers";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["activate", "deactivate"]).default("activate"),
  originalTransactionId: z.string().min(4).max(128).optional(),
  productId: z.string().min(1).max(128).optional(),
  entitlementId: z.string().min(1).max(64).optional(),
  revenueCatAppUserId: z.string().min(1).max(128).optional(),
  entitlementActive: z.boolean().optional(),
  selectedMarkets: z.array(z.string()).optional(),
});

/**
 * Sync Apple IAP / RevenueCat entitlement after a native purchase.
 * Auth: logged-in session cookie (or Bearer) from the WebView.
 */
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid Apple IAP payload.");

    const {
      action,
      originalTransactionId,
      productId,
      entitlementId,
      revenueCatAppUserId,
      entitlementActive,
      selectedMarkets,
    } = parsed.data;

    if (action === "deactivate" || entitlementActive === false) {
      await deactivateAppleSubscription(user.id);
      return json({ ok: true, plan: "none" });
    }

    if (!originalTransactionId) {
      return badRequest("originalTransactionId is required to activate.");
    }

    const tier: PricingTierId =
      tierFromAppleProductId(productId) ??
      tierFromEntitlementId(entitlementId) ??
      "lite";

    await activateAppleSubscription({
      userId: user.id,
      originalTransactionId,
      productId,
      entitlementId: entitlementId ?? tier,
      revenueCatAppUserId: revenueCatAppUserId ?? user.id,
      selectedMarkets: selectedMarkets as IntelligenceMarketId[] | undefined,
    });

    return json({ ok: true, tier, plan: tier });
  } catch (error) {
    console.error("[api/subscription/apple]", error);
    return serverError("Could not sync Apple subscription.");
  }
}
