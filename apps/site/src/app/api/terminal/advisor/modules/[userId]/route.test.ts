import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueNativeReaderToken } from "@/lib/terminal/native-reader-token";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  accessErrorResponse: vi.fn((err: unknown) => Response.json({ error: String(err) }, { status: 403 })),
  assertUserMatch: vi.fn(),
  ensureSimTrial: vi.fn(),
  requireTerminalSession: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
}));

vi.mock("@/lib/terminal/auth", () => ({
  accessErrorResponse: mocks.accessErrorResponse,
  assertUserMatch: mocks.assertUserMatch,
  requireTerminalSession: mocks.requireTerminalSession,
}));

vi.mock("@/lib/terminal/simulation", () => ({
  ensureSimTrial: mocks.ensureSimTrial,
}));

const MODULES = ["trades", "crypto", "penny", "betting", "predictions"];

const originalEnv = {
  NATIVE_READER_REQUIRE_TOKEN: process.env.NATIVE_READER_REQUIRE_TOKEN,
  NATIVE_READER_TOKEN_SECRET: process.env.NATIVE_READER_TOKEN_SECRET,
};

function paidUser() {
  return {
    id: "user_paid",
    email: "paid@example.com",
    intelligenceTier: "elite",
    selectedMarkets: JSON.stringify(["stocks", "crypto", "pink_slips", "sports_betting", "prediction_markets"]),
    stripeSubscriptionId: "sub_paid",
    subscriptionStatus: "active",
    accessExpiresAt: null,
    disabledAt: null,
  };
}

function nativeRequest(headers: HeadersInit = {}): Request {
  return new Request("https://www.motivefxai.com/api/terminal/advisor/modules/user_paid", {
    headers: {
      "user-agent": "MotiveFXNative/1.0 (iOS 18.0)",
      ...headers,
    },
  });
}

async function getModules(headers: HeadersInit = {}) {
  const response = await GET(nativeRequest(headers), { params: Promise.resolve({ userId: "user_paid" }) });
  return {
    response,
    body: await response.json(),
  };
}

describe("GET /api/terminal/advisor/modules/[userId] native reader clamp", () => {
  beforeEach(() => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";
    process.env.NATIVE_READER_TOKEN_SECRET = "test-native-reader-secret";
    mocks.requireTerminalSession.mockResolvedValue({ ok: true, session: { user: paidUser() } });
    mocks.ensureSimTrial.mockResolvedValue({ status: "active", remainingUses: 3 });
  });

  afterEach(() => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = originalEnv.NATIVE_READER_REQUIRE_TOKEN;
    process.env.NATIVE_READER_TOKEN_SECRET = originalEnv.NATIVE_READER_TOKEN_SECRET;
    vi.clearAllMocks();
  });

  it("returns free-reader module entitlements for signed iOS App Store requests", async () => {
    const { token } = await issueNativeReaderToken({
      channel: "app_store",
      platform: "ios",
      appVersion: "1.0.0",
      nonce: "modules-ios-reader-test",
    });

    const { response, body } = await getModules({ "x-motivefx-native-reader": token });

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      active: MODULES,
      allowedMarkets: MODULES,
      hasAnnual: false,
      tier: "lite",
      simulation: { status: "active", remainingUses: 3 },
    });
    expect(body.features.ask_motive).toBe(true);
    expect(body.features.api_access).toBe(false);
    expect(body.features.team_workspace).toBe(false);
  });

  it("preserves paid module entitlements for spoofed native user agents in strict token mode", async () => {
    const { response, body } = await getModules();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      active: MODULES,
      allowedMarkets: MODULES,
      hasAnnual: true,
      tier: "elite",
    });
    expect(body.features.api_access).toBe(true);
    expect(body.features.team_workspace).toBe(true);
  });

  it("does not apply the iOS App Store clamp to signed Android reader tokens", async () => {
    const { token } = await issueNativeReaderToken({
      channel: "play_store",
      platform: "android",
      appVersion: "1.0.0",
      nonce: "modules-android-reader-test",
    });

    const { response, body } = await getModules({ "x-motivefx-native-reader": token });

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      hasAnnual: true,
      tier: "elite",
    });
    expect(body.features.api_access).toBe(true);
  });
});
