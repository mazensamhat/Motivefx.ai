import { prisma } from "@motivefx/database";
import { z } from "zod";
import { badRequest, json, serverError } from "@/lib/api";
import { databaseConfigHint, isDatabaseConfigured } from "@/lib/db-check";
import {
  getAppUrl,
  getStripe,
  getTierPriceId,
  isStripeConfigured,
  resolveStripeCustomerId,
  stripeConfigHint,
} from "@/lib/stripe";
import {
  validateSelectedMarkets,
  type IntelligenceMarketId,
  type PricingTierId,
} from "@/lib/tiers";

const bodySchema = z.object({
  tier: z.enum(["lite", "pro", "ultra", "ultra_plus", "elite"]),
  email: z.string().email(),
  selectedMarkets: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      const hint = stripeConfigHint();
      return badRequest(
        hint ||
          "Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel (Production), then redeploy."
      );
    }

    if (!isDatabaseConfigured()) {
      return badRequest(databaseConfigHint() || "Database not configured.");
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? "Invalid request");

    const tier = parsed.data.tier as PricingTierId;
    const email = parsed.data.email.trim().toLowerCase();
    let markets: IntelligenceMarketId[];
    try {
      markets = validateSelectedMarkets(tier, parsed.data.selectedMarkets as IntelligenceMarketId[]);
    } catch (e) {
      return badRequest(e instanceof Error ? e.message : "Invalid markets");
    }

    const priceId = getTierPriceId(tier);
    if (!priceId) {
      return badRequest(`Missing Stripe price for tier '${tier}'. Set STRIPE_PRICE_${tier.toUpperCase()} in env.`);
    }

    const stripe = getStripe()!;
    const appUrl = getAppUrl();

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    const customerId = await resolveStripeCustomerId(
      stripe,
      user.id,
      email,
      user.stripeCustomerId
    );
    if (customerId !== user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const marketsJson = JSON.stringify(markets);
    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: {
        userId: user.id,
        tier,
        selectedMarkets: marketsJson,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
          selectedMarkets: marketsJson,
        },
      },
    });

    if (!checkout.url) return serverError("Could not create checkout session.");
    return json({ url: checkout.url });
  } catch (error) {
    console.error("[api/subscription/checkout]", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Can't reach database") || msg.includes("connect ECONNREFUSED")) {
      return badRequest(
        "Database unreachable. Check DATABASE_URL in .env.local and run pnpm db:push against Supabase."
      );
    }
    return serverError("Checkout failed.");
  }
}
