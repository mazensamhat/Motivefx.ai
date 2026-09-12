import { afterEach, describe, expect, it, vi } from "vitest";
import { requireModuleOrSimAllowingIosReader } from "./access";
import type { TerminalPlan } from "./plan";
import { issueNativeReaderToken } from "./native-reader-token";

vi.mock("./auth", () => {
  class ModuleLockedError extends Error {
    module: string;

    constructor(module: string) {
      super("Subscribe to unlock this intelligence market.");
      this.name = "ModuleLockedError";
      this.module = module;
    }
  }

  class FeatureLockedError extends Error {
    feature: string;

    constructor(feature: string, label: string) {
      super(`Upgrade your plan to unlock ${label}.`);
      this.name = "FeatureLockedError";
      this.feature = feature;
    }
  }

  return { FeatureLockedError, ModuleLockedError };
});

vi.mock("./simulation", () => ({
  simHasModule: vi.fn(() => false),
}));

const ORIGINAL_REQUIRE_TOKEN = process.env.NATIVE_READER_REQUIRE_TOKEN;
const ORIGINAL_TOKEN_SECRET = process.env.NATIVE_READER_TOKEN_SECRET;

const lockedPlan: TerminalPlan = {
  tier: "lite",
  selectedMarkets: [],
  allowedMarkets: [],
  active: [],
  features: {},
  entitlements: [],
  hasAnnual: false,
  hasSubscription: false,
};

const userWithoutSimulation = {
  id: "user_1",
  simTrialStartedAt: null,
  simBankroll: null,
  stripeSubscriptionId: null,
  appleOriginalTransactionId: null,
  subscriptionStatus: "none",
  accessExpiresAt: null,
  disabledAt: null,
  intelligenceTier: "lite",
  selectedMarkets: "[]",
} as any;

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
  return new Request("https://motivefx.test/api/advisor/betting/analyze?user_id=user_1", {
    method: "POST",
    headers: {
      "user-agent": "MotiveFXNative/1.0 (iOS 18.0)",
      ...headers,
    },
  });
}

describe("iOS reader module access bypass", () => {
  afterEach(() => {
    restoreEnv();
    vi.clearAllMocks();
  });

  it("keeps the legacy user-agent bypass when strict tokens are disabled", async () => {
    delete process.env.NATIVE_READER_REQUIRE_TOKEN;

    await expect(
      requireModuleOrSimAllowingIosReader(
        nativeIosRequest(),
        lockedPlan,
        userWithoutSimulation,
        "betting"
      )
    ).resolves.toBeUndefined();
  });

  it("does not allow user-agent-only bypasses when strict native reader tokens are required", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";

    await expect(
      requireModuleOrSimAllowingIosReader(
        nativeIosRequest(),
        lockedPlan,
        userWithoutSimulation,
        "betting"
      )
    ).rejects.toMatchObject({
      name: "ModuleLockedError",
      module: "betting",
    });
  });

  it("allows a valid native reader token to bypass module locks in strict mode", async () => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";
    process.env.NATIVE_READER_TOKEN_SECRET = "test-native-reader-secret";
    const { token } = await issueNativeReaderToken({
      channel: "app_store",
      platform: "ios",
      appVersion: "1.0.0",
    });

    await expect(
      requireModuleOrSimAllowingIosReader(
        nativeIosRequest({ "x-motivefx-native-reader": token }),
        lockedPlan,
        userWithoutSimulation,
        "betting"
      )
    ).resolves.toBeUndefined();
  });
});
