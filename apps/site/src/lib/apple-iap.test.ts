import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidateUserCache: vi.fn(),
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@motivefx/database", () => ({
  prisma: mocks.prisma,
}));

vi.mock("./load-user", () => ({
  invalidateUserCache: mocks.invalidateUserCache,
}));

import {
  APPLE_PRODUCT_IDS,
  activateAppleSubscription,
  deactivateAppleSubscription,
  defaultMarketsForTier,
  marketsJsonForTier,
  tierFromAppleProductId,
  tierFromEntitlementId,
} from "./apple-iap";

describe("Apple IAP entitlement handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.user.findFirst.mockReset();
    mocks.prisma.user.findUnique.mockReset();
    mocks.prisma.user.update.mockReset();
  });

  it("maps only known Apple products and RevenueCat entitlements to internal tiers", () => {
    expect(tierFromAppleProductId(APPLE_PRODUCT_IDS.ultra_plus)).toBe("ultra_plus");
    expect(tierFromAppleProductId("Ultra Plus")).toBeNull();
    expect(tierFromAppleProductId(null)).toBeNull();

    expect(tierFromEntitlementId("elite")).toBe("elite");
    expect(tierFromEntitlementId("Elite")).toBeNull();
    expect(tierFromEntitlementId(undefined)).toBeNull();
  });

  it("falls back to safe tier defaults when selected markets do not match the tier", () => {
    expect(defaultMarketsForTier("lite")).toEqual(["stocks"]);
    expect(defaultMarketsForTier("pro")).toEqual(["stocks", "crypto"]);
    expect(defaultMarketsForTier("ultra_plus")).toEqual([
      "stocks",
      "crypto",
      "pink_slips",
      "sports_betting",
      "prediction_markets",
    ]);

    expect(JSON.parse(marketsJsonForTier("lite", ["stocks", "crypto"]))).toEqual(["stocks"]);
    expect(JSON.parse(marketsJsonForTier("pro", ["prediction_markets"]))).toEqual([
      "stocks",
      "crypto",
    ]);
    expect(JSON.parse(marketsJsonForTier("ultra", ["stocks"]))).toEqual([
      "stocks",
      "crypto",
      "pink_slips",
      "sports_betting",
      "prediction_markets",
    ]);
  });

  it("does not let Apple activation overwrite operator-granted comp access", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      subscriptionStatus: "comp",
      selectedMarkets: null,
    });

    await activateAppleSubscription({
      userId: "user_123",
      originalTransactionId: "tx_123",
      productId: APPLE_PRODUCT_IDS.elite,
      revenueCatAppUserId: "rc_123",
    });

    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.invalidateUserCache).not.toHaveBeenCalled();
  });

  it("preserves valid prior market picks while attaching Apple billing metadata", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      subscriptionStatus: "active",
      selectedMarkets: JSON.stringify(["sports_betting", "prediction_markets"]),
    });

    await activateAppleSubscription({
      userId: "user_123",
      originalTransactionId: "tx_123",
      productId: APPLE_PRODUCT_IDS.pro,
    });

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: expect.objectContaining({
        intelligenceTier: "pro",
        selectedMarkets: JSON.stringify(["sports_betting", "prediction_markets"]),
        subscriptionStatus: "active",
        billingProvider: "apple",
        appleOriginalTransactionId: "tx_123",
        appleProductId: APPLE_PRODUCT_IDS.pro,
        revenueCatAppUserId: "user_123",
        stripeSubscriptionId: null,
        accessExpiresAt: null,
      }),
    });
    expect(mocks.invalidateUserCache).toHaveBeenCalledWith("user_123");
  });

  it("ignores stale or non-Apple deactivation events before clearing access", async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      subscriptionStatus: "active",
      billingProvider: "stripe",
      appleOriginalTransactionId: null,
    });

    await deactivateAppleSubscription("user_123", "old_tx");

    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      subscriptionStatus: "active",
      billingProvider: "apple",
      appleOriginalTransactionId: "new_tx",
    });

    await deactivateAppleSubscription("user_123", "old_tx");

    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.invalidateUserCache).not.toHaveBeenCalled();

    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      subscriptionStatus: "active",
      billingProvider: "apple",
      appleOriginalTransactionId: "new_tx",
    });

    await deactivateAppleSubscription("user_123", "new_tx");

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: {
        intelligenceTier: "lite",
        subscriptionStatus: "cancelled",
        appleOriginalTransactionId: null,
        appleProductId: null,
        billingProvider: null,
      },
    });
    expect(mocks.invalidateUserCache).toHaveBeenCalledWith("user_123");
  });
});
