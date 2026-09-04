import { z } from "zod";
import { getSession } from "@/lib/session";
import { badRequest, json, serverError, unauthorized } from "@/lib/api";
import { findUserSafeCached } from "@/lib/load-user";

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
 * Native Apple/RevenueCat sync acknowledgement.
 *
 * IMPORTANT: the client is not an entitlement authority. Product IDs,
 * transaction IDs and `entitlementActive` values supplied by the app can be
 * forged, so this route must never grant or revoke paid access from them.
 * RevenueCat's authenticated server webhook is the only path that mutates
 * Apple subscription state.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid Apple IAP payload.");

    const user = await findUserSafeCached({ id: session.id }, { timeoutMs: 5_000 });
    if (!user || user.disabledAt) return unauthorized();

    // Do not trust any entitlement fields from the device. The native app may
    // call this immediately after a RevenueCat purchase to refresh its UI; the
    // authoritative grant arrives through /api/webhooks/revenuecat.
    const active =
      user.subscriptionStatus === "active" || user.subscriptionStatus === "comp";

    return json({
      ok: true,
      authoritativeSource: "revenuecat_webhook",
      pending: parsed.data.action === "activate" && !active,
      subscriptionStatus: user.subscriptionStatus,
      tier: active ? user.intelligenceTier : "lite",
      plan: active ? user.intelligenceTier : "none",
    });
  } catch (error) {
    console.error("[api/subscription/apple]", error);
    return serverError("Could not sync Apple subscription.");
  }
}
