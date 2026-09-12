import { afterEach, describe, expect, it } from "vitest";
import {
  isTrustedNativeReaderRequest,
  planForRequest,
} from "./ios-reader";
import { issueNativeReaderToken } from "./native-reader-token";
import { iosAppStoreReaderPlan } from "./plan";

const ORIGINAL_REQUIRE_TOKEN = process.env.NATIVE_READER_REQUIRE_TOKEN;
const ORIGINAL_TOKEN_SECRET = process.env.NATIVE_READER_TOKEN_SECRET;

function restoreEnv() {
  if (ORIGINAL_REQUIRE_TOKEN === undefined) {
    delete process.env.NATIVE_READER_REQUIRE_TOKEN;
  } else {
    process.env.NATIVE_READER_REQUIRE_TOKEN = ORIGINAL_REQUIRE_TOKEN;
  }

  if (ORIGINAL_TOKEN_SECRET === undefined) {
    delete process.env.NATIVE_READER_TOKEN_SECRET;
  } else {
    process.env.NATIVE_READER_TOKEN_SECRET = ORIGINAL_TOKEN_SECRET;
  }
}

function nativeIosRequest(headers: HeadersInit = {}) {
  return new Request("https://motivefx.test/terminal", {
    headers: {
      "user-agent": "MotiveFXNative/1.0 (iOS 18.0)",
      ...headers,
    },
  });
}

function subscribedUser() {
  return {
    id: "user_1",
    email: "paid@example.com",
    intelligenceTier: "elite",
    selectedMarkets: JSON.stringify(["sports_betting", "prediction_markets"]),
    stripeSubscriptionId: "sub_123",
    appleOriginalTransactionId: null,
    subscriptionStatus: "active",
    accessExpiresAt: null,
    disabledAt: null,
  } as any;
}

describe("native iOS reader detection", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("allows the legacy native iOS user-agent fallback when strict tokens are disabled", async () => {
    delete process.env.NATIVE_READER_REQUIRE_TOKEN;

    await expect(isTrustedNativeReaderRequest(nativeIosRequest())).resolves.toBe(true);
  });

  it("rejects user-agent-only native iOS requests when strict tokens are required", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";

    await expect(isTrustedNativeReaderRequest(nativeIosRequest())).resolves.toBe(false);
  });

  it("trusts a valid native reader token in strict mode", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";
    process.env.NATIVE_READER_TOKEN_SECRET = "test-native-reader-secret";
    const { token } = await issueNativeReaderToken({
      channel: "app_store",
      platform: "ios",
      appVersion: "1.0.0",
    });

    await expect(
      isTrustedNativeReaderRequest(nativeIosRequest({ "x-motivefx-native-reader": token }))
    ).resolves.toBe(true);
  });

  it("clamps paid users to the free reader plan for trusted native requests", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";
    process.env.NATIVE_READER_TOKEN_SECRET = "test-native-reader-secret";
    const { token } = await issueNativeReaderToken({
      channel: "app_store",
      platform: "ios",
      appVersion: "1.0.0",
    });

    const plan = await planForRequest(
      nativeIosRequest({ "x-motivefx-native-reader": token }),
      subscribedUser()
    );

    expect(plan).toMatchObject({
      tier: "lite",
      hasAnnual: false,
      hasSubscription: false,
    });
    expect(plan?.active).toEqual(iosAppStoreReaderPlan().active);
  });
});
