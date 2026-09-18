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

vi.mock("@motivefx/database", () => ({ prisma: mocks.prisma }));
vi.mock("./load-user", () => ({ invalidateUserCache: mocks.invalidateUserCache }));

import {
  APPLE_PRODUCT_IDS,
  activateAppleSubscription,
  deactivateAppleSubscription,
  findUserIdByRevenueCatAppUserId,
  marketsJsonForTier,
  tierFromAppleProductId,
  tierFromEntitlementId,
} from "./apple-iap";

describe("Apple IAP entitlement mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps only known App Store product and RevenueCat entitlement ids", () => {
    expect(tierFromAppleProductId("Ultra.Plus")).toBe("ultra_plus");
    expect(tierFromAppleProductId("unknown")).toBeNull();
    expect(tierFromEntitlementId("elite")).toBe("elite");
    expect(tierFromEntitlementId("Ultra.Plus")).toBeNull();
  });

  it("falls back to tier defaults when selected markets do not fit the tier", () => {
    expect(JSON.parse(marketsJsonForTier("pro", ["stocks", "crypto"]))).toEqual([
      "stocks",
      "crypto",
    ]);
    expect(JSON.parse(marketsJsonForTier("lite", ["stocks", "crypto"]))).toEqual([
      "stocks",
    ]);
    expect(JSON.parse(marketsJsonForTier("ultra_plus", ["crypto"]))).toEqual([
      "stocks",
      "crypto",
      "pink_slips",
      "sports_betting",
      "prediction_markets",
    ]);
  });
});

describe("activateAppleSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not overwrite ops-granted comp access", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      selectedMarkets: null,
      subscriptionStatus: "comp",
    });

    await activateAppleSubscription({
      userId: "user_1",
      originalTransactionId: "original_txn_1",
      productId: APPLE_PRODUCT_IDS.pro,
    });

    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.invalidateUserCache).not.toHaveBeenCalled();
  });

  it("applies a valid Apple tier and clears Stripe-managed billing state", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      selectedMarkets: null,
      subscriptionStatus: "cancelled",
    });

    await activateAppleSubscription({
      userId: "user_1",
      originalTransactionId: "original_txn_1",
      productId: APPLE_PRODUCT_IDS.pro,
      revenueCatAppUserId: "rc_user_1",
      selectedMarkets: ["crypto", "pink_slips"],
    });

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: expect.objectContaining({
        appleOriginalTransactionId: "original_txn_1",
        appleProductId: APPLE_PRODUCT_IDS.pro,
        billingProvider: "apple",
        intelligenceTier: "pro",
        revenueCatAppUserId: "rc_user_1",
        selectedMarkets: JSON.stringify(["crypto", "pink_slips"]),
        stripeSubscriptionId: null,
        subscriptionStatus: "active",
      }),
    });
    expect(mocks.invalidateUserCache).toHaveBeenCalledWith("user_1");
  });

  it("preserves prior market picks on renewal when they are still valid", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      selectedMarkets: JSON.stringify(["crypto", "sports_betting"]),
      subscriptionStatus: "active",
    });

    await activateAppleSubscription({
      userId: "user_1",
      originalTransactionId: "original_txn_1",
      entitlementId: "pro",
    });

    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appleProductId: APPLE_PRODUCT_IDS.pro,
          intelligenceTier: "pro",
          selectedMarkets: JSON.stringify(["crypto", "sports_betting"]),
        }),
      })
    );
  });
});

describe("deactivateAppleSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not revoke comp, Stripe-managed, or newer Apple access", async () => {
    for (const existing of [
      {
        appleOriginalTransactionId: "original_txn_1",
        billingProvider: "apple",
        subscriptionStatus: "comp",
      },
      {
        appleOriginalTransactionId: null,
        billingProvider: "stripe",
        subscriptionStatus: "active",
      },
      {
        appleOriginalTransactionId: "new_original_txn",
        billingProvider: "apple",
        subscriptionStatus: "active",
      },
    ]) {
      mocks.prisma.user.findUnique.mockResolvedValueOnce(existing);
    }

    await deactivateAppleSubscription("user_1", "original_txn_1");
    await deactivateAppleSubscription("user_1", "original_txn_1");
    await deactivateAppleSubscription("user_1", "old_original_txn");

    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
    expect(mocks.invalidateUserCache).not.toHaveBeenCalled();
  });

  it("cancels matching Apple-managed access and invalidates the user cache", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      appleOriginalTransactionId: "original_txn_1",
      billingProvider: "apple",
      subscriptionStatus: "active",
    });

    await deactivateAppleSubscription("user_1", "original_txn_1");

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        appleOriginalTransactionId: null,
        appleProductId: null,
        billingProvider: null,
        intelligenceTier: "lite",
        subscriptionStatus: "cancelled",
      },
    });
    expect(mocks.invalidateUserCache).toHaveBeenCalledWith("user_1");
  });
});

describe("findUserIdByRevenueCatAppUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to the MotiveFX user id when no RevenueCat alias row exists", async () => {
    mocks.prisma.user.findFirst.mockResolvedValue(null);
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "user_1" });

    await expect(findUserIdByRevenueCatAppUserId("user_1")).resolves.toBe("user_1");

    expect(mocks.prisma.user.findFirst).toHaveBeenCalledWith({
      where: { revenueCatAppUserId: "user_1" },
      select: { id: true },
    });
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { id: true },
    });
  });
});
