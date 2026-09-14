import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  prisma: {
    passwordResetToken: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@motivefx/database", () => db);

import {
  consumeOneTimeAuthToken,
  issueOneTimeAuthToken,
} from "./one-time-auth";

function purposeHash(purpose: string, token: string) {
  return createHash("sha256").update(`${purpose}:${token}`).digest("hex");
}

function transactionWith(row: unknown, deleteCount: number) {
  const tx = {
    passwordResetToken: {
      findUnique: vi.fn().mockResolvedValue(row),
      deleteMany: vi.fn().mockResolvedValue({ count: deleteCount }),
    },
  };
  db.prisma.$transaction.mockImplementationOnce(async (callback) => callback(tx));
  return tx;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T08:00:00.000Z"));
  db.prisma.passwordResetToken.create.mockReset();
  db.prisma.$transaction.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("one-time auth tokens", () => {
  it("stores native handoff tokens as purpose-scoped hashes with bounded expiry", async () => {
    const token = await issueOneTimeAuthToken("user_123", "native_handoff", 120);

    expect(token).toMatch(/^mfxhandoff_/);
    expect(db.prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: "user_123",
        tokenHash: purposeHash("native_handoff", token),
        expiresAt: new Date("2026-09-14T08:02:00.000Z"),
      },
    });
    expect(db.prisma.passwordResetToken.create.mock.calls[0][0].data.tokenHash).not.toContain(
      token
    );
  });

  it("uses a separate hash domain for pending 2FA and native handoff tokens", async () => {
    const rawToken = "mfx2fa_shared-token";
    const pendingTx = transactionWith(
      {
        id: "token_123",
        userId: "user_123",
        expiresAt: new Date("2026-09-14T08:05:00.000Z"),
      },
      1
    );

    await consumeOneTimeAuthToken(` ${rawToken} `, "pending_2fa");
    expect(pendingTx.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: purposeHash("pending_2fa", rawToken) },
      select: { id: true, userId: true, expiresAt: true },
    });

    const handoffTx = transactionWith(
      {
        id: "token_456",
        userId: "user_456",
        expiresAt: new Date("2026-09-14T08:05:00.000Z"),
      },
      1
    );
    await consumeOneTimeAuthToken(rawToken, "native_handoff");

    expect(handoffTx.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: purposeHash("native_handoff", rawToken) },
      select: { id: true, userId: true, expiresAt: true },
    });
    expect(purposeHash("pending_2fa", rawToken)).not.toBe(
      purposeHash("native_handoff", rawToken)
    );
  });

  it("returns the user id only when the token row is atomically deleted", async () => {
    const token = "mfx2fa_claim-me";
    const tx = transactionWith(
      {
        id: "token_123",
        userId: "user_123",
        expiresAt: new Date("2026-09-14T08:05:00.000Z"),
      },
      1
    );

    await expect(consumeOneTimeAuthToken(token, "pending_2fa")).resolves.toBe("user_123");
    expect(tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "token_123",
        tokenHash: purposeHash("pending_2fa", token),
      },
    });

    transactionWith(
      {
        id: "token_123",
        userId: "user_123",
        expiresAt: new Date("2026-09-14T08:05:00.000Z"),
      },
      0
    );
    await expect(consumeOneTimeAuthToken(token, "pending_2fa")).resolves.toBeNull();
  });

  it("cleans up expired rows without granting a session", async () => {
    const tx = transactionWith(
      {
        id: "expired_token",
        userId: "user_123",
        expiresAt: new Date("2026-09-14T07:59:59.000Z"),
      },
      1
    );

    await expect(consumeOneTimeAuthToken("mfxhandoff_expired", "native_handoff")).resolves.toBeNull();
    expect(tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "expired_token" },
    });
  });
});
