import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import {
  isTrustedNativeReaderRequest,
  planForRequest,
} from "./ios-reader";
import { issueNativeReaderToken } from "./native-reader-token";

type ReaderUser = NonNullable<Parameters<typeof planForRequest>[1]>;

const ORIGINAL_ENV = { ...process.env };

function nativeRequest(headers: HeadersInit = {}) {
  return new Request("https://motivefx.test/terminal", { headers });
}

function user(overrides: Partial<ReaderUser> = {}): ReaderUser {
  return {
    id: "user_1",
    email: "reader@example.com",
    intelligenceTier: "elite",
    selectedMarkets: JSON.stringify([
      "stocks",
      "crypto",
      "pink_slips",
      "sports_betting",
      "prediction_markets",
    ]),
    stripeSubscriptionId: "sub_123",
    subscriptionStatus: "active",
    accessExpiresAt: null,
    disabledAt: null,
    appleOriginalTransactionId: null,
    billingProvider: "stripe",
    ...overrides,
  } as ReaderUser;
}

async function readerToken() {
  const issued = await issueNativeReaderToken({
    platform: "ios",
    channel: "app_store",
    appVersion: "1.2.3",
    nonce: "deterministic-test-nonce",
  });
  return issued.token;
}

describe("iOS native reader trust", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NATIVE_READER_TOKEN_SECRET: "test-native-reader-secret",
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects user-agent-only reader claims when token strictness is enabled", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";

    await expect(
      isTrustedNativeReaderRequest(
        nativeRequest({ "user-agent": "MotiveFXNative/1.0 (iOS; iPhone)" })
      )
    ).resolves.toBe(false);
  });

  it("accepts a signed native reader token even without the legacy user agent", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "1";
    const token = await readerToken();

    await expect(
      isTrustedNativeReaderRequest(
        nativeRequest({ "x-motivefx-native-reader": token })
      )
    ).resolves.toBe(true);
  });

  it("keeps legacy iOS user-agent bootstrap available outside strict mode", async () => {
    await expect(
      isTrustedNativeReaderRequest(
        nativeRequest({ "user-agent": "MotiveFXNative/1.0 (iOS; iPad)" })
      )
    ).resolves.toBe(true);
  });

  it("clamps paid web subscribers to the free reader plan for trusted iOS requests", async () => {
    const token = await readerToken();

    const plan = await planForRequest(
      nativeRequest({ "x-motivefx-native-reader": token }),
      user()
    );

    expect(plan).toMatchObject({
      tier: "lite",
      hasSubscription: false,
      hasAnnual: false,
    });
    expect(plan?.allowedMarkets).toEqual(
      expect.arrayContaining(["trades", "crypto", "penny", "betting", "predictions"])
    );
    expect(plan?.features.api_access).toBe(false);
    expect(plan?.features.team_workspace).toBe(false);
  });

  it("returns normal web entitlements when the request is not a trusted reader", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";

    const plan = await planForRequest(nativeRequest(), user());

    expect(plan).toMatchObject({
      tier: "elite",
      hasSubscription: true,
      hasAnnual: true,
    });
  });
});
