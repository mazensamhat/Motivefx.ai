import Stripe from "stripe";
import type { PricingTierId } from "./tiers";

let stripeClient: Stripe | null = null;

export function isValidStripeSecretKey(key: string | undefined): boolean {
  if (!key?.trim()) return false;
  const trimmed = key.trim();
  if (trimmed.includes("...") || trimmed.endsWith("_")) return false;
  if (trimmed.startsWith("pk_")) return false;
  return /^sk_(test|live)_[A-Za-z0-9]+$/.test(trimmed) && trimmed.length >= 24;
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
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
