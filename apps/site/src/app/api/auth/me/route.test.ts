import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueNativeReaderToken } from "@/lib/terminal/native-reader-token";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  findUserSafeCached: vi.fn(),
  getEffectiveSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/ops/impersonation", () => ({
  getEffectiveSession: mocks.getEffectiveSession,
}));

vi.mock("@/lib/admin", () => ({
  isAdminEmail: (email: string) => email === "admin@example.com",
}));

vi.mock("@/lib/load-user", () => ({
  findUserSafeCached: mocks.findUserSafeCached,
}));

const originalEnv = {
  NATIVE_READER_REQUIRE_TOKEN: process.env.NATIVE_READER_REQUIRE_TOKEN,
  NATIVE_READER_TOKEN_SECRET: process.env.NATIVE_READER_TOKEN_SECRET,
};

function paidUser() {
  return {
    id: "user_paid",
    email: "paid@example.com",
    intelligenceTier: "elite",
    selectedMarkets: JSON.stringify(["stocks", "crypto"]),
    stripeSubscriptionId: "sub_paid",
    subscriptionStatus: "active",
    accessExpiresAt: "2027-01-01T00:00:00.000Z",
    disabledAt: null,
    totpEnabled: true,
  };
}

function nativeRequest(headers: HeadersInit = {}): Request {
  return new Request("https://www.motivefxai.com/api/auth/me", {
    headers: {
      "user-agent": "MotiveFXNative/1.0 (iOS 18.0)",
      ...headers,
    },
  });
}

describe("GET /api/auth/me native reader clamp", () => {
  beforeEach(() => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = "true";
    process.env.NATIVE_READER_TOKEN_SECRET = "test-native-reader-secret";
    mocks.getSession.mockResolvedValue({ id: "actor", email: "paid@example.com" });
    mocks.getEffectiveSession.mockResolvedValue({ id: "user_paid", email: "paid@example.com" });
    mocks.findUserSafeCached.mockResolvedValue(paidUser());
  });

  afterEach(() => {
    process.env.NATIVE_READER_REQUIRE_TOKEN = originalEnv.NATIVE_READER_REQUIRE_TOKEN;
    process.env.NATIVE_READER_TOKEN_SECRET = originalEnv.NATIVE_READER_TOKEN_SECRET;
    vi.clearAllMocks();
  });

  it("scrubs paid subscription state for signed iOS App Store reader requests", async () => {
    const { token } = await issueNativeReaderToken({
      channel: "app_store",
      platform: "ios",
      appVersion: "1.0.0",
      nonce: "auth-me-ios-reader-test",
    });

    const response = await GET(nativeRequest({ "x-motivefx-native-reader": token }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({
      id: "user_paid",
      email: "paid@example.com",
      intelligenceTier: "lite",
      selectedMarkets: ["stocks", "crypto"],
      stripeSubscriptionId: null,
      subscriptionStatus: "none",
      accessExpiresAt: null,
      hasSubscription: false,
      totpEnabled: true,
      impersonating: false,
    });
  });

  it("does not scrub paid state for spoofed native user agents in strict token mode", async () => {
    const response = await GET(nativeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({
      intelligenceTier: "elite",
      stripeSubscriptionId: "sub_paid",
      subscriptionStatus: "active",
      accessExpiresAt: "2027-01-01T00:00:00.000Z",
      hasSubscription: true,
    });
  });
});
