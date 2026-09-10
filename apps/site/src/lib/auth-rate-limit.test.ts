import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const opsAuditEvent = {
    count: vi.fn(),
    create: vi.fn(),
  };

  return {
    opsAuditEvent,
    prisma: { opsAuditEvent },
  };
});

vi.mock("@motivefx/database", () => ({ prisma: mocks.prisma }));

import { consumeAuthRateLimit, requestIp } from "./auth-rate-limit";

function expectedTargetId(scope: string, identifier: string) {
  return createHash("sha256").update(`${scope}:${identifier}`).digest("hex").slice(0, 40);
}

describe("auth rate limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T08:00:00.000Z"));
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("uses trusted proxy headers before falling back to forwarded-for", () => {
    expect(
      requestIp(
        new Request("https://motivefx.test", {
          headers: {
            "x-forwarded-for": "203.0.113.10, 198.51.100.2",
          },
        })
      )
    ).toBe("203.0.113.10");

    expect(
      requestIp(
        new Request("https://motivefx.test", {
          headers: {
            "x-vercel-forwarded-for": "198.51.100.44",
            "x-real-ip": "198.51.100.45",
            "x-forwarded-for": "198.51.100.46",
          },
        })
      )
    ).toBe("198.51.100.44");

    expect(requestIp(new Request("https://motivefx.test"))).toBe("unknown");
  });

  it("records an anonymized auth attempt inside the configured window", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    mocks.opsAuditEvent.count.mockResolvedValue(2);

    await expect(
      consumeAuthRateLimit({
        scope: "login_account",
        identifier: "USER@Example.com|203.0.113.5",
        limit: 10,
        windowMs: 15 * 60 * 1000,
      })
    ).resolves.toBe(true);

    const targetId = expectedTargetId("login_account", "USER@Example.com|203.0.113.5");
    expect(mocks.opsAuditEvent.count).toHaveBeenCalledWith({
      where: {
        action: "auth.rate_limit.login_account",
        targetId,
        observedAt: { gte: new Date("2026-09-10T07:45:00.000Z") },
      },
    });
    expect(mocks.opsAuditEvent.create).toHaveBeenCalledWith({
      data: {
        actorId: "anonymous",
        actorEmail: "anonymous@motivefx.local",
        action: "auth.rate_limit.login_account",
        capability: null,
        risk: "LOW",
        targetType: "auth_rate_limit",
        targetId,
        reason: null,
        beforeJson: null,
        afterJson: null,
        result: "attempt",
        environment: "preview",
      },
    });
    expect(targetId).not.toContain("USER@Example.com");
    expect(targetId).not.toContain("203.0.113.5");
  });

  it("rejects requests at the limit without writing another audit event", async () => {
    mocks.opsAuditEvent.count.mockResolvedValue(5);

    await expect(
      consumeAuthRateLimit({
        scope: "forgot_account",
        identifier: "user@example.com|198.51.100.12",
        limit: 5,
        windowMs: 60 * 60 * 1000,
      })
    ).resolves.toBe(false);

    expect(mocks.opsAuditEvent.create).not.toHaveBeenCalled();
  });

  it("keeps different throttle scopes in separate hash domains", async () => {
    mocks.opsAuditEvent.count.mockResolvedValue(0);

    await consumeAuthRateLimit({
      scope: "login_ip",
      identifier: "203.0.113.50",
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });
    await consumeAuthRateLimit({
      scope: "forgot_ip",
      identifier: "203.0.113.50",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const [loginWrite, forgotWrite] = mocks.opsAuditEvent.create.mock.calls.map(
      ([call]) => call.data
    );
    expect(loginWrite.action).toBe("auth.rate_limit.login_ip");
    expect(forgotWrite.action).toBe("auth.rate_limit.forgot_ip");
    expect(loginWrite.targetId).toBe(expectedTargetId("login_ip", "203.0.113.50"));
    expect(forgotWrite.targetId).toBe(expectedTargetId("forgot_ip", "203.0.113.50"));
    expect(loginWrite.targetId).not.toBe(forgotWrite.targetId);
  });
});
