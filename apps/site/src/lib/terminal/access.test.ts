import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
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

  return {
    simHasModule: vi.fn(),
    ModuleLockedError,
    FeatureLockedError,
  };
});

vi.mock("./auth", () => ({
  ModuleLockedError: mocks.ModuleLockedError,
  FeatureLockedError: mocks.FeatureLockedError,
}));

vi.mock("./simulation", () => ({
  simHasModule: mocks.simHasModule,
}));

import {
  requireFeatureAllowingIosReader,
  requireModuleAllowingIosReader,
  requireModuleOrSimAllowingIosReader,
} from "./access";
import { issueNativeReaderToken } from "./native-reader-token";
import { planForUser } from "./plan";
import { simHasModule } from "./simulation";

type PlanUser = Parameters<typeof planForUser>[0];

const ORIGINAL_ENV = { ...process.env };

function nativeRequest(headers: HeadersInit = {}) {
  return new Request("https://motivefx.test/terminal", { headers });
}

function user(overrides: Partial<PlanUser> = {}): PlanUser {
  return {
    id: "user_1",
    email: "locked@example.com",
    intelligenceTier: "lite",
    selectedMarkets: JSON.stringify(["sports_betting"]),
    stripeSubscriptionId: null,
    subscriptionStatus: "none",
    accessExpiresAt: null,
    disabledAt: null,
    simTrialStartedAt: null,
    simBankroll: 1000,
    ...overrides,
  } as PlanUser;
}

async function readerToken() {
  const issued = await issueNativeReaderToken({
    platform: "ios",
    channel: "app_store",
    appVersion: "1.2.3",
    nonce: "deterministic-access-test-nonce",
  });
  return issued.token;
}

describe("iOS-aware terminal access guards", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NATIVE_READER_REQUIRE_TOKEN: "true",
      NATIVE_READER_TOKEN_SECRET: "test-native-reader-secret",
    };
    vi.mocked(simHasModule).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("does not let a spoofed iOS user agent bypass module locks in strict mode", async () => {
    const lockedUser = user();
    const plan = planForUser(lockedUser);

    await expect(
      requireModuleOrSimAllowingIosReader(
        nativeRequest({ "user-agent": "MotiveFXNative/1.0 (iOS; iPhone)" }),
        plan,
        lockedUser,
        "betting"
      )
    ).rejects.toBeInstanceOf(mocks.ModuleLockedError);
  });

  it("allows a locked module for a signed iOS reader request", async () => {
    const lockedUser = user();
    const token = await readerToken();

    await expect(
      requireModuleOrSimAllowingIosReader(
        nativeRequest({ "x-motivefx-native-reader": token }),
        planForUser(lockedUser),
        lockedUser,
        "betting"
      )
    ).resolves.toBeUndefined();
  });

  it("still honors active simulation access for non-reader requests", async () => {
    const lockedUser = user();
    vi.mocked(simHasModule).mockReturnValue(true);

    await expect(
      requireModuleOrSimAllowingIosReader(
        nativeRequest(),
        planForUser(lockedUser),
        lockedUser,
        "betting"
      )
    ).resolves.toBeUndefined();
  });

  it("uses the same trusted-reader policy for paid module and feature guards", async () => {
    const lockedPlan = planForUser(user());

    await expect(
      requireModuleAllowingIosReader(
        nativeRequest({ "user-agent": "MotiveFXNative/1.0 (iOS; iPhone)" }),
        lockedPlan,
        "predictions"
      )
    ).rejects.toBeInstanceOf(mocks.ModuleLockedError);

    await expect(
      requireFeatureAllowingIosReader(
        nativeRequest({ "user-agent": "MotiveFXNative/1.0 (iOS; iPhone)" }),
        lockedPlan,
        "market_intelligence"
      )
    ).rejects.toBeInstanceOf(mocks.FeatureLockedError);
  });
});
