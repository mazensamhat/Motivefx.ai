import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const passwordResetToken = {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  };
  return {
    passwordResetToken,
    prisma: {
      passwordResetToken,
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@motivefx/database", () => ({ prisma: mocks.prisma }));

import { consumeOneTimeAuthToken, issueOneTimeAuthToken } from "./one-time-auth";

function expectedHash(purpose: "pending_2fa" | "native_handoff", token: string) {
  return createHash("sha256").update(`${purpose}:${token}`).digest("hex");
}

describe("one-time auth tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T08:00:00.000Z"));
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback({ passwordResetToken: mocks.passwordResetToken })
    );
  });

  it("issues native handoff tokens with purpose-scoped hashes and TTLs", async () => {
    const token = await issueOneTimeAuthToken("user_123", "native_handoff", 120);

    expect(token).toMatch(/^mfxhandoff_/);
    expect(mocks.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: "user_123",
        tokenHash: expectedHash("native_handoff", token),
        expiresAt: new Date("2026-09-09T08:02:00.000Z"),
      },
    });
  });

  it("keeps pending 2FA tokens in a separate hash domain", async () => {
    const token = await issueOneTimeAuthToken("user_2fa", "pending_2fa", 300);

    expect(token).toMatch(/^mfx2fa_/);
    expect(mocks.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: "user_2fa",
        tokenHash: expectedHash("pending_2fa", token),
        expiresAt: new Date("2026-09-09T08:05:00.000Z"),
      },
    });
    expect(expectedHash("pending_2fa", token)).not.toBe(
      expectedHash("native_handoff", token)
    );
  });

  it("atomically claims a valid token exactly once", async () => {
    mocks.passwordResetToken.findUnique.mockResolvedValue({
      id: "token_row",
      userId: "user_123",
      expiresAt: new Date("2026-09-09T08:01:00.000Z"),
    });
    mocks.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });

    const userId = await consumeOneTimeAuthToken(
      "  mfxhandoff_valid_ticket  ",
      "native_handoff"
    );

    const tokenHash = expectedHash("native_handoff", "mfxhandoff_valid_ticket");
    expect(userId).toBe("user_123");
    expect(mocks.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
    expect(mocks.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "token_row", tokenHash },
    });
  });

  it("rejects already-claimed tokens when the atomic delete loses the race", async () => {
    mocks.passwordResetToken.findUnique.mockResolvedValue({
      id: "token_row",
      userId: "user_123",
      expiresAt: new Date("2026-09-09T08:01:00.000Z"),
    });
    mocks.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      consumeOneTimeAuthToken("mfxhandoff_valid_ticket", "native_handoff")
    ).resolves.toBeNull();
  });

  it("deletes expired rows without authenticating the user", async () => {
    mocks.passwordResetToken.findUnique.mockResolvedValue({
      id: "expired_row",
      userId: "user_123",
      expiresAt: new Date("2026-09-09T07:59:59.000Z"),
    });

    await expect(
      consumeOneTimeAuthToken("mfxhandoff_expired_ticket", "native_handoff")
    ).resolves.toBeNull();

    expect(mocks.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "expired_row" },
    });
  });
});
