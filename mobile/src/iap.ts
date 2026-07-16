import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? "";
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? "";
/** Explicit feature flag — set true when RC keys are present in EAS. */
const IAP_ENABLED = process.env.EXPO_PUBLIC_IAP_ENABLED?.trim() === "true";

/** Subscription group reference name in App Store Connect. */
export const SUBSCRIPTION_GROUP = "Monthly";

/** Apple product IDs ↔ MotiveFX intelligence tiers (exact ASC Product IDs). */
export const APPLE_PRODUCT_IDS = {
  lite: "Lite",
  pro: "Pro",
  ultra: "Ultra",
  ultra_plus: "Ultra.Plus",
  elite: "Elite",
} as const;

export type IntelligenceTierId = keyof typeof APPLE_PRODUCT_IDS;

/** RevenueCat entitlement ids — one per tier (exact match to intelligenceTier). */
export const TIER_ENTITLEMENTS: IntelligenceTierId[] = [
  "lite",
  "pro",
  "ultra",
  "ultra_plus",
  "elite",
];

const TIER_RANK: Record<IntelligenceTierId, number> = {
  lite: 0,
  pro: 1,
  ultra: 2,
  ultra_plus: 3,
  elite: 4,
};

let configured = false;

export function isIapConfigured(): boolean {
  const hasKey = Platform.OS === "ios" ? Boolean(IOS_API_KEY) : Boolean(ANDROID_API_KEY);
  if (!hasKey) return false;
  // Prefer explicit flag when set; otherwise enable whenever a key is present.
  if (process.env.EXPO_PUBLIC_IAP_ENABLED != null && process.env.EXPO_PUBLIC_IAP_ENABLED !== "") {
    return IAP_ENABLED;
  }
  return true;
}

export async function configureIap(appUserId?: string | null): Promise<boolean> {
  if (!isIapConfigured()) return false;
  if (configured) {
    if (appUserId) {
      try {
        await Purchases.logIn(appUserId);
      } catch {
        // ignore login races
      }
    }
    return true;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.INFO);
  const apiKey = Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY;
  await Purchases.configure({
    apiKey,
    appUserID: appUserId || undefined,
  });
  configured = true;
  return true;
}

function productIdForTier(tier: IntelligenceTierId): string {
  return APPLE_PRODUCT_IDS[tier];
}

function pickPackageForTier(
  packages: PurchasesPackage[],
  tier: IntelligenceTierId
): PurchasesPackage | null {
  const productId = productIdForTier(tier);
  const byProduct = packages.find((p) => p.product.identifier === productId);
  if (byProduct) return byProduct;

  const hints = [
    tier,
    tier.replace("_", ""),
    tier.replace("_", "."), // ultra_plus → ultra.plus (matches Ultra.Plus case-insensitively below)
    `$rc_${tier}`,
    tier === "elite" ? "$rc_annual" : "$rc_monthly",
    tier === "elite" ? "annual" : "monthly",
  ];
  for (const hint of hints) {
    const hintLower = hint.toLowerCase();
    const match = packages.find(
      (p) =>
        p.identifier === hint ||
        p.identifier.toLowerCase().includes(hintLower) ||
        p.product.identifier === productId ||
        p.product.identifier.toLowerCase() === hintLower
    );
    if (match) return match;
  }
  return null;
}

function highestActiveTier(customerInfo: CustomerInfo): IntelligenceTierId | null {
  let best: IntelligenceTierId | null = null;
  for (const tier of TIER_ENTITLEMENTS) {
    if (!customerInfo.entitlements.active[tier]) continue;
    if (!best || TIER_RANK[tier] > TIER_RANK[best]) best = tier;
  }
  return best;
}

function entitlementForTier(customerInfo: CustomerInfo, tier?: IntelligenceTierId | null) {
  const activeTier = tier ?? highestActiveTier(customerInfo);
  if (!activeTier) return null;
  return customerInfo.entitlements.active[activeTier] ?? null;
}

export async function purchaseTier(tier: IntelligenceTierId): Promise<{
  ok: boolean;
  customerInfo?: CustomerInfo;
  originalTransactionId?: string;
  productId?: string;
  tier?: IntelligenceTierId;
  error?: string;
}> {
  if (!(await configureIap())) {
    return { ok: false, error: "In-app purchases are not configured yet." };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current?.availablePackages?.length) {
      return {
        ok: false,
        error: "No App Store subscription products are available yet. Try again later.",
      };
    }

    const pkg = pickPackageForTier(current.availablePackages, tier);
    if (!pkg) {
      return {
        ok: false,
        error: `No App Store package found for ${tier}. Check RevenueCat offerings.`,
      };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const entitlement = entitlementForTier(customerInfo, tier);
    const active = Boolean(entitlement) || Boolean(highestActiveTier(customerInfo));
    if (!active) {
      return {
        ok: false,
        error: "Purchase completed but entitlement is not active yet.",
        customerInfo,
      };
    }

    const resolvedTier = highestActiveTier(customerInfo) ?? tier;
    const ent = entitlementForTier(customerInfo, resolvedTier);
    return {
      ok: true,
      customerInfo,
      tier: resolvedTier,
      originalTransactionId:
        ent?.latestPurchaseDate ||
        ent?.originalPurchaseDate ||
        customerInfo.originalAppUserId,
      productId: ent?.productIdentifier ?? pkg.product.identifier,
    };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) {
      return { ok: false, error: "Purchase cancelled." };
    }
    return {
      ok: false,
      error: err?.message ?? "Purchase failed. Please try again.",
    };
  }
}

export async function restorePurchases(): Promise<{
  ok: boolean;
  customerInfo?: CustomerInfo;
  originalTransactionId?: string;
  productId?: string;
  tier?: IntelligenceTierId;
  error?: string;
}> {
  if (!(await configureIap())) {
    return { ok: false, error: "In-app purchases are not configured yet." };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const tier = highestActiveTier(customerInfo);
    const entitlement = entitlementForTier(customerInfo, tier);
    if (!entitlement || !tier) {
      return { ok: false, error: "No active MotiveFX subscription found to restore." };
    }
    return {
      ok: true,
      customerInfo,
      tier,
      originalTransactionId: entitlement.originalPurchaseDate,
      productId: entitlement.productIdentifier,
    };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, error: err?.message ?? "Restore failed." };
  }
}

/** Prefer StoreKit transaction id when RevenueCat exposes it on the entitlement. */
export function extractTransactionId(customerInfo: CustomerInfo): string | null {
  const tier = highestActiveTier(customerInfo);
  const entitlement = entitlementForTier(customerInfo, tier);
  if (!entitlement) return null;
  const productId = entitlement.productIdentifier;
  const sub = customerInfo.subscriptionsByProductIdentifier?.[productId] as
    | { storeTransactionId?: string; originalPurchaseDate?: string }
    | undefined;
  if (sub?.storeTransactionId) return sub.storeTransactionId;
  return entitlement.originalPurchaseDate ?? customerInfo.originalAppUserId ?? null;
}

export function isValidTier(value: string | undefined | null): value is IntelligenceTierId {
  return Boolean(value && value in APPLE_PRODUCT_IDS);
}
