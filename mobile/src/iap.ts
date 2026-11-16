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
let configuredUserId: string | null = null;
let identityUncertain = false;
let operationTail: Promise<unknown> = Promise.resolve();
function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const next = operationTail.then(operation);
  operationTail = next.catch(() => {});
  return next;
}

export function isIapConfigured(): boolean {
  // App Store resubmit path: iOS is a free informational reader until ASC IAP
  // products + RevenueCat are fully submitted (guidelines 2.1(b) / 3.1.1).
  if (Platform.OS === "ios") return false;
  const hasKey = Boolean(ANDROID_API_KEY);
  if (!hasKey) return false;
  // A public SDK key alone must never activate purchases.
  return IAP_ENABLED;
}

async function configureIapUnlocked(appUserId?: string | null): Promise<boolean> {
  if (!isIapConfigured() || !appUserId || identityUncertain) return false;
  if (configured) {
    if (appUserId !== configuredUserId) {
      try {
        await Promise.race([
          Purchases.logIn(appUserId),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("iap login timeout")), 4_000);
          }),
        ]);
        configuredUserId = appUserId;
      } catch {
        // A timed-out native login may finish later. Do not allow another
        // purchase in this process until a fresh app launch resets the SDK.
        identityUncertain = true;
        return false;
      }
    }
    return true;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.INFO);
    const apiKey = Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY;
    await Promise.race([
      Purchases.configure({
        apiKey,
        appUserID: appUserId || undefined,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("iap configure timeout")), 5_000);
      }),
    ]);
    configured = true;
    configuredUserId = appUserId;
    return true;
  } catch (e) {
    identityUncertain = true;
    console.warn("Store identity could not be confirmed; restart before retrying.");
    return false;
  }
}

function productIdForTier(tier: IntelligenceTierId): string {
  return APPLE_PRODUCT_IDS[tier];
}

function pickPackageForTier(
  packages: PurchasesPackage[],
  tier: IntelligenceTierId
): PurchasesPackage | null {
  const productId = productIdForTier(tier);
  // Exact store product identity only. Generic monthly/annual package hints
  // can charge a different tier when the requested product is missing.
  return packages.find((pkg) => pkg.product.identifier === productId) ?? null;
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

async function purchaseTierUnlocked(tier: IntelligenceTierId, appUserId: string): Promise<{
  ok: boolean;
  customerInfo?: CustomerInfo;
  originalTransactionId?: string;
  productId?: string;
  tier?: IntelligenceTierId;
  error?: string;
}> {
  if (!(await configureIapUnlocked(appUserId))) {
    return { ok: false, error: "In-app purchases are not configured yet." };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current?.availablePackages?.length) {
      return {
        ok: false,
        error: "No store subscription products are available yet. Try again later.",
      };
    }

    const pkg = pickPackageForTier(current.availablePackages, tier);
    if (!pkg) {
      return {
        ok: false,
        error: `No store package found for ${tier}. Check RevenueCat offerings.`,
      };
    }

    if (await Purchases.getAppUserID() !== appUserId) {
      identityUncertain = true;
      return { ok: false, error: "Store account identity changed. Restart before retrying." };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const entitlement = entitlementForTier(customerInfo, tier);
    const active = Boolean(entitlement && entitlement.productIdentifier === pkg.product.identifier);
    if (!active) {
      return {
        ok: false,
        error: "Purchase completed but entitlement is not active yet.",
        customerInfo,
      };
    }

    const resolvedTier = tier;
    const ent = entitlementForTier(customerInfo, resolvedTier);
    return {
      ok: true,
      customerInfo,
      tier: resolvedTier,
      originalTransactionId: extractTransactionId(customerInfo) ?? undefined,
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

async function restorePurchasesUnlocked(appUserId: string): Promise<{
  ok: boolean;
  customerInfo?: CustomerInfo;
  originalTransactionId?: string;
  productId?: string;
  tier?: IntelligenceTierId;
  error?: string;
}> {
  if (!(await configureIapUnlocked(appUserId))) {
    return { ok: false, error: "In-app purchases are not configured yet." };
  }
  try {
    if (await Purchases.getAppUserID() !== appUserId) {
      identityUncertain = true;
      return { ok: false, error: "Store account identity changed. Restart before retrying." };
    }
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
      originalTransactionId: extractTransactionId(customerInfo) ?? undefined,
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
  return null; // Dates and app-user IDs are not store transaction identities.
}

export function isValidTier(value: string | undefined | null): value is IntelligenceTierId {
  return Boolean(value && Object.hasOwn(APPLE_PRODUCT_IDS, value));
}

export const configureIap = (userId?: string | null) => exclusive(() => configureIapUnlocked(userId));
export const purchaseTier = (tier: IntelligenceTierId, userId: string) => exclusive(() => purchaseTierUnlocked(tier, userId));
export const restorePurchases = (userId: string) => exclusive(() => restorePurchasesUnlocked(userId));
export const resetIapIdentity = () => exclusive(async () => {
  if (!configured) return;
  configuredUserId = null;
  try {
    await Promise.race([Purchases.logOut(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("iap logout timeout")), 4000))]);
  } catch { identityUncertain = true; }
});

export function serverEntitlementConfirmed(value: { authoritativeSource?: string; pending?: boolean; tier?: string; subscriptionStatus?: string }, requestedTier?: string | null) {
  return value.authoritativeSource === "revenuecat_webhook" && value.pending === false &&
    ["active", "comp"].includes(value.subscriptionStatus ?? "") && isValidTier(value.tier) && value.tier === requestedTier;
}
