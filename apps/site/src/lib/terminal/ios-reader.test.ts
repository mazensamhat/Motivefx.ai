import type { User } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { issueNativeReaderToken } from "./native-reader-token";
import { isTrustedNativeReaderRequest, planForRequest } from "./ios-reader";

const MODULES = ["trades", "crypto", "penny", "betting", "predictions"];

const originalEnv = {
  NATIVE_READER_REQUIRE_TOKEN: process.env.NATIVE_READER_REQUIRE_TOKEN,
  NATIVE_READER_TOKEN_SECRET: process.env.NATIVE_READER_TOKEN_SECRET,
};

function paidEliteUser(): User {
  return {
    id: "user_paid",
    email: "paid@example.com",
    intelligenceTier: "elite",
    selectedMarkets: JSON.stringify(["stocks", "crypto", "pink_slips", "sports_betting", "prediction_markets"]),
    stripeSubscriptionId: "sub_paid",
    subscriptionStatus: "active",
    accessExpiresAt: null,
    disabledAt: null,
  } as unknown as User;
}

function nativeRequest(headers: HeadersInit = {}): Request {
  return new Request("https://www.motivefxai.com/api/test", {
    headers: {
      "user-agent": "MotiveFXNative/1.0 (iOS 18.0)",
      ...headers,
    },
  });
}

describe("iOS native reader trust boundary", () => {
  beforeEach(() => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";
    process.env.NATIVE_READER_TOKEN_SECRET = "test-native-reader-secret";
  });

  afterEach(() => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = originalEnv.NATIVE_READER_REQUIRE_TOKEN;
    process.env.NATIVE_READER_TOKEN_SECRET = originalEnv.NATIVE_READER_TOKEN_SECRET;
  });

  it("rejects spoofed iOS native user agents when strict token mode is enabled", async () => {
    const request = nativeRequest();

    await expect(isTrustedNativeReaderRequest(request)).resolves.toBe(false);

    const plan = await planForRequest(request, paidEliteUser());

    expect(plan).toMatchObject({
      tier: "elite",
      hasAnnual: true,
      hasSubscription: true,
      active: MODULES,
    });
    expect(plan?.features.api_access).toBe(true);
  });

  it("clamps signed iOS App Store reader requests to free-reader entitlements", async () => {
    const { token } = await issueNativeReaderToken({
      channel: "app_store",
      platform: "ios",
      appVersion: "1.0.0",
      nonce: "ios-reader-test",
    });
    const request = nativeRequest({ "x-motivefx-native-reader": token });

    await expect(isTrustedNativeReaderRequest(request)).resolves.toBe(true);

    const plan = await planForRequest(request, paidEliteUser());

    expect(plan).toMatchObject({
      tier: "lite",
      hasAnnual: false,
      hasSubscription: false,
      active: MODULES,
      allowedMarkets: MODULES,
    });
    expect(plan?.features.ask_motive).toBe(true);
    expect(plan?.features.api_access).toBe(false);
    expect(plan?.features.team_workspace).toBe(false);
  });

  it("does not use signed Android reader tokens for the iOS App Store clamp", async () => {
    const { token } = await issueNativeReaderToken({
      channel: "play_store",
      platform: "android",
      appVersion: "1.0.0",
      nonce: "android-reader-test",
    });
    const request = nativeRequest({ "x-motivefx-native-reader": token });

    await expect(isTrustedNativeReaderRequest(request)).resolves.toBe(false);

    const plan = await planForRequest(request, paidEliteUser());

    expect(plan).toMatchObject({
      tier: "elite",
      hasAnnual: true,
      hasSubscription: true,
      active: MODULES,
    });
    expect(plan?.features.api_access).toBe(true);
  });
});
