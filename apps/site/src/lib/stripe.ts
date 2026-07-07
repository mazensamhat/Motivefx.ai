import Stripe from "stripe";
import type { PricingTierId } from "./tiers";

let stripeClient: Stripe | null = null;

function normalizeEnvSecret(value: string | undefined): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

export function isValidStripeSecretKey(key: string | undefined): boolean {
  const trimmed = normalizeEnvSecret(key);
  if (!trimmed) return false;
  if (trimmed.includes("...") || trimmed.startsWith("pk_") || trimmed.startsWith("whsec_")) return false;
  return (trimmed.startsWith("sk_test_") || trimmed.startsWith("sk_live_")) && trimmed.length >= 24;
}

export function stripeConfigHint(): string {
  const key = normalizeEnvSecret(process.env.STRIPE_SECRET_KEY);
  if (!key) {
    return "STRIPE_SECRET_KEY is missing in Vercel → Settings → Environment Variables (Production). Redeploy after saving.";
  }
  if (key.startsWith("pk_")) {
    return "STRIPE_SECRET_KEY is a publishable key (pk_). Use the Secret key (sk_test_ or sk_live_) from Stripe → Developers → API keys.";
  }
  if (key.startsWith("whsec_")) {
    return "STRIPE_SECRET_KEY is set to the webhook signing secret (whsec_). That belongs in STRIPE_WEBHOOK_SECRET. Use sk_test_ or sk_live_ for STRIPE_SECRET_KEY.";
  }
  if (key.startsWith("rk_")) {
    return "STRIPE_SECRET_KEY is a restricted key (rk_). Use the full Secret key (sk_test_ or sk_live_) instead.";
  }
  if (!isValidStripeSecretKey(key)) {
    return "STRIPE_SECRET_KEY format looks invalid. Copy the full Secret key from Stripe Dashboard with no quotes or extra spaces, then redeploy.";
  }
  return "";
}

export function getStripe(): Stripe | null {
  const key = normalizeEnvSecret(process.env.STRIPE_SECRET_KEY);
  if (!key || !isValidStripeSecretKey(key)) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-08-27.basil" });
  }
  return stripeClient;
}

const TIER_PRICE_ENV: Record<PricingTierId, string> = {
  lite: "STRIPE_PRICE_LITE",
  pro: "STRIPE_PRICE_PRO",
  ultra: "STRIPE_PRICE_ULTRA",
  ultra_plus: "STRIPE_PRICE_ULTRA_PLUS",
  elite: "STRIPE_PRICE_ELITE",
};

export function getTierPriceId(tier: PricingTierId): string {
  const envKey = TIER_PRICE_ENV[tier];
  const priceId = process.env[envKey]?.trim() ?? "";
  if (!priceId || priceId.includes("...") || !priceId.startsWith("price_")) return "";
  return priceId;
}

export function hasTierPriceConfig(tier: PricingTierId): boolean {
  return Boolean(getTierPriceId(tier));
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3010";
}

export function isStripeConfigured() {
  return Boolean(getStripe());
}

export async function resolveStripeCustomerId(
  stripe: Stripe,
  userId: string,
  email: string,
  existingCustomerId: string | null | undefined
): Promise<string> {
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return customer.id;
    } catch {
      // Stale customer from another Stripe account
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
}
