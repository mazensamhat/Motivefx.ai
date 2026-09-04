import { json, forbidden, unauthorized } from "@/lib/api";
import { requireAdminCapability } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/db-check";
import { getTierPriceId, isStripeConfigured, stripeConfigHint } from "@/lib/stripe";
import type { PricingTierId } from "@/lib/tiers";

const TIERS: PricingTierId[] = ["lite", "pro", "ultra", "ultra_plus", "elite"];

/** Internal billing diagnostics. Public liveness lives at /api/health. */
export async function GET() {
  const auth = await requireAdminCapability("view_revenue");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const prices = Object.fromEntries(
    TIERS.map((tier) => [tier, Boolean(getTierPriceId(tier))])
  );

  return json({
    stripeConfigured: isStripeConfigured(),
    stripeHint: stripeConfigHint() || null,
    stripeKeyPresent: Boolean(stripeKey),
    // Never return even a partial secret. Presence is sufficient for diagnostics.
    databaseConfigured: isDatabaseConfigured(),
    pricesConfigured: prices,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    vercel: Boolean(process.env.VERCEL),
  });
}
