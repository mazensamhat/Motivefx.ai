import { prisma } from "@motivefx/database";
import {
  INTELLIGENCE_MARKETS,
  type IntelligenceMarketId,
  type PricingTierId,
  validateSelectedMarkets,
} from "./tiers";

/** Apple product IDs (App Store Connect + RevenueCat). */
export const APPLE_PRODUCT_IDS: Record<PricingTierId, string> = {
  lite: "ai.motivefx.app.lite.monthly",
  pro: "ai.motivefx.app.pro.monthly",
  ultra: "ai.motivefx.app.ultra.monthly",
  ultra_plus: "ai.motivefx.app.ultra_plus.monthly",
  elite: "ai.motivefx.app.elite.yearly",
};

const PRODUCT_TO_TIER = Object.fromEntries(
  Object.entries(APPLE_PRODUCT_IDS).map(([tier, productId]) => [productId, tier])
) as Record<string, PricingTierId>;

export function tierFromAppleProductId(productId?: string | null): PricingTierId | null {
  if (!productId) return null;
  return PRODUCT_TO_TIER[productId] ?? null;
}

export function tierFromEntitlementId(entitlementId?: string | null): PricingTierId | null {
  if (!entitlementId) return null;
  if (
    entitlementId === "lite" ||
    entitlementId === "pro" ||
    entitlementId === "ultra" ||
    entitlementId === "ultra_plus" ||
    entitlementId === "elite"
  ) {
    return entitlementId;
  }
  return null;
}

/**
 * Default markets when IAP does not include a picker:
 * Lite → first market (stocks); Pro → first two; Ultra+ → all five.
 */
export function defaultMarketsForTier(tier: PricingTierId): IntelligenceMarketId[] {
  const all = INTELLIGENCE_MARKETS.map((m) => m.id);
  if (tier === "lite") return [all[0]!];
  if (tier === "pro") return all.slice(0, 2);
  return all;
}

export function marketsJsonForTier(
  tier: PricingTierId,
  selectedMarkets?: IntelligenceMarketId[] | null
): string {
  try {
    const markets = selectedMarkets?.length
      ? validateSelectedMarkets(tier, selectedMarkets)
      : defaultMarketsForTier(tier);
    return JSON.stringify(markets);
  } catch {
    return JSON.stringify(defaultMarketsForTier(tier));
  }
}

export async function activateAppleSubscription(params: {
  userId: string;
  originalTransactionId: string;
  productId?: string | null;
  entitlementId?: string | null;
  revenueCatAppUserId?: string | null;
  selectedMarkets?: IntelligenceMarketId[] | null;
}) {
  const existing = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { subscriptionStatus: true, selectedMarkets: true },
  });
  // Ops-granted comp access must not be overwritten by store events.
  if (existing?.subscriptionStatus === "comp") return;

  const tier =
    tierFromAppleProductId(params.productId) ??
    tierFromEntitlementId(params.entitlementId) ??
    "lite";

  let selectedMarketsJson: string;
  if (params.selectedMarkets?.length) {
    selectedMarketsJson = marketsJsonForTier(tier, params.selectedMarkets);
  } else if (existing?.selectedMarkets) {
    // Keep prior picks when upgrading/renewing if still valid for this tier.
    try {
      const parsed = JSON.parse(existing.selectedMarkets) as IntelligenceMarketId[];
      selectedMarketsJson = marketsJsonForTier(tier, parsed);
    } catch {
      selectedMarketsJson = marketsJsonForTier(tier);
    }
  } else {
    selectedMarketsJson = marketsJsonForTier(tier);
  }

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      intelligenceTier: tier,
      selectedMarkets: selectedMarketsJson,
      subscriptionStatus: "active",
      billingProvider: "apple",
      appleOriginalTransactionId: params.originalTransactionId,
      appleProductId: params.productId ?? APPLE_PRODUCT_IDS[tier],
      revenueCatAppUserId: params.revenueCatAppUserId ?? params.userId,
      // Clear Stripe ids so we don't treat this as Stripe-managed billing.
      stripeSubscriptionId: null,
      accessExpiresAt: null,
    },
  });
}

export async function deactivateAppleSubscription(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, billingProvider: true },
  });
  if (existing?.subscriptionStatus === "comp") return;
  // Only clear Apple-managed rows (avoid wiping an active Stripe sub).
  if (existing?.billingProvider && existing.billingProvider !== "apple") return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      intelligenceTier: "lite",
      subscriptionStatus: "cancelled",
      appleOriginalTransactionId: null,
      appleProductId: null,
      billingProvider: null,
    },
  });
}

export async function findUserIdByAppleTransaction(
  originalTransactionId: string
): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { appleOriginalTransactionId: originalTransactionId },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function findUserIdByRevenueCatAppUserId(
  appUserId: string
): Promise<string | null> {
  const byRc = await prisma.user.findFirst({
    where: { revenueCatAppUserId: appUserId },
    select: { id: true },
  });
  if (byRc) return byRc.id;

  // App user id is often our MotiveFX user id.
  const byId = await prisma.user.findUnique({
    where: { id: appUserId },
    select: { id: true },
  });
  return byId?.id ?? null;
}
