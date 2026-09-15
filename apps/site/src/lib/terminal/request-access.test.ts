import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SessionUser = {
  id: string;
  email: string;
  intelligenceTier: string | null;
  selectedMarkets: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string;
  accessExpiresAt: Date | string | null;
  disabledAt: Date | string | null;
  simTrialStartedAt: Date | null;
  simBankroll: number | null;
  [key: string]: unknown;
};

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
    requireTerminalSession: vi.fn(),
    simHasModule: vi.fn(),
    ModuleLockedError,
    FeatureLockedError,
  };
});

vi.mock("./auth", () => ({
  requireTerminalSession: mocks.requireTerminalSession,
  ModuleLockedError: mocks.ModuleLockedError,
  FeatureLockedError: mocks.FeatureLockedError,
}));

vi.mock("./simulation", () => ({
  simHasModule: mocks.simHasModule,
}));

import { issueNativeReaderToken } from "./native-reader-token";
import { ModuleAccessError, resolveAccess } from "./request-access";

const ORIGINAL_ENV = { ...process.env };

function terminalRequest(headers: HeadersInit = {}) {
  return new Request("https://motivefx.test/terminal/advisor?user_id=user_1", {
    headers,
  });
}

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user_1",
    email: "subscriber@example.com",
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
    simTrialStartedAt: null,
    simBankroll: 1000,
    ...overrides,
  };
}

async function readerToken() {
  const issued = await issueNativeReaderToken({
    platform: "ios",
    channel: "app_store",
    appVersion: "1.2.3",
    nonce: "deterministic-resolve-test-nonce",
  });
  return issued.token;
}

describe("resolveAccess native reader behavior", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NATIVE_READER_REQUIRE_TOKEN: "true",
      NATIVE_READER_TOKEN_SECRET: "test-native-reader-secret",
    };
    mocks.requireTerminalSession.mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    });
    mocks.simHasModule.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects anonymous module access when strict mode only sees a spoofed iOS user agent", async () => {
    await expect(
      resolveAccess(
        terminalRequest({ "user-agent": "MotiveFXNative/1.0 (iOS; iPhone)" }),
        "betting"
      )
    ).rejects.toBeInstanceOf(ModuleAccessError);
  });

  it("resolves a signed anonymous iOS reader as demo access with the free reader plan", async () => {
    const token = await readerToken();

    const access = await resolveAccess(
      terminalRequest({ "x-motivefx-native-reader": token }),
      "betting"
    );

    expect(access).toMatchObject({
      userId: "demo",
      user: null,
      authenticated: false,
      demo: true,
    });
    expect(access.plan).not.toBeNull();
    expect(access.plan!).toMatchObject({
      tier: "lite",
      hasSubscription: false,
      hasAnnual: false,
    });
    expect(access.plan!.allowedMarkets).toEqual(
      expect.arrayContaining(["betting", "predictions"])
    );
  });

  it("clamps authenticated subscribers to reader entitlements inside the signed iOS shell", async () => {
    const subscriber = user();
    const token = await readerToken();
    mocks.requireTerminalSession.mockResolvedValue({
      ok: true,
      session: { user: subscriber },
    });

    const access = await resolveAccess(
      terminalRequest({ "x-motivefx-native-reader": token }),
      "predictions"
    );

    expect(access).toMatchObject({
      userId: subscriber.id,
      user: subscriber,
      authenticated: true,
    });
    expect(access.plan).not.toBeNull();
    expect(access.plan!).toMatchObject({
      tier: "lite",
      hasSubscription: false,
      hasAnnual: false,
    });
    expect(access.plan!.features.api_access).toBe(false);
    expect(access.plan!.features.team_workspace).toBe(false);
  });
});
