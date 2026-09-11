import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  opsAuditEvent: {
    count: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@motivefx/database", () => ({ prisma }));

import { consumeAuthRateLimit, requestIp } from "./auth-rate-limit";

const NOW = new Date("2026-01-02T03:04:05.000Z");

describe("requestIp", () => {
  it("prefers platform-provided client IP headers in a stable order", () => {
    const request = new Request("https://motivefx.test/login", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-real-ip": "198.51.100.20",
        "x-forwarded-for": "192.0.2.30, 192.0.2.31",
      },
    });

    expect(requestIp(request)).toBe("203.0.113.10");
  });

  it("falls back to the first x-forwarded-for address, then unknown", () => {
    const forwarded = new Request("https://motivefx.test/login", {
      headers: {
        "x-forwarded-for": "192.0.2.30, 192.0.2.31",
      },
    });
    const missing = new Request("https://motivefx.test/login");

    expect(requestIp(forwarded)).toBe("192.0.2.30");
    expect(requestIp(missing)).toBe("unknown");
  });
});

describe("consumeAuthRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("records allowed attempts with a scoped hash instead of raw identifiers", async () => {
    prisma.opsAuditEvent.count.mockResolvedValue(2);
    prisma.opsAuditEvent.create.mockResolvedValue({});

    const allowed = await consumeAuthRateLimit({
      scope: "login",
      identifier: "reader@example.com|203.0.113.10",
      limit: 3,
      windowMs: 60_000,
    });

    expect(allowed).toBe(true);
    expect(prisma.opsAuditEvent.count).toHaveBeenCalledWith({
      where: {
        action: "auth.rate_limit.login",
        targetId: expect.stringMatching(/^[a-f0-9]{40}$/),
        observedAt: { gte: new Date(NOW.getTime() - 60_000) },
      },
    });

    const countArgs = prisma.opsAuditEvent.count.mock.calls[0][0];
    const targetId = countArgs.where.targetId;
    expect(targetId).not.toContain("reader@example.com");
    expect(targetId).not.toContain("203.0.113.10");
    expect(prisma.opsAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "anonymous",
        actorEmail: "anonymous@motivefx.local",
        action: "auth.rate_limit.login",
        targetType: "auth_rate_limit",
        targetId,
        result: "attempt",
        environment: "preview",
      }),
    });
  });

  it("denies attempts at the limit without writing another audit event", async () => {
    prisma.opsAuditEvent.count.mockResolvedValue(3);

    const allowed = await consumeAuthRateLimit({
      scope: "password_reset",
      identifier: "reader@example.com",
      limit: 3,
      windowMs: 300_000,
    });

    expect(allowed).toBe(false);
    expect(prisma.opsAuditEvent.create).not.toHaveBeenCalled();
  });
});
