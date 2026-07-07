import { json } from "@/lib/api";
import { isDatabaseConfigured } from "@/lib/db-check";
import { getTierPriceId, isStripeConfigured, stripeConfigHint } from "@/lib/stripe";
import type { PricingTierId } from "@/lib/tiers";

const TIERS: PricingTierId[] = ["lite", "pro", "ultra", "ultra_plus", "elite"];

/** Safe diagnostics — no secrets returned. Hit GET /api/billing/status on your deploy. */
export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const prices = Object.fromEntries(
    TIERS.map((tier) => [tier, Boolean(getTierPriceId(tier))])
  );

  return json({
    stripeConfigured: isStripeConfigured(),
    stripeHint: stripeConfigHint() || null,
    stripeKeyPresent: Boolean(stripeKey),
    stripeKeyPrefix: stripeKey ? stripeKey.slice(0, 7) + "..." : null,
    databaseConfigured: isDatabaseConfigured(),
    pricesConfigured: prices,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    vercel: Boolean(process.env.VERCEL),
  });
}
