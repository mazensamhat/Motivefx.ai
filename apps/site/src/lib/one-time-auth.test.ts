import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  passwordResetToken: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@motivefx/database", () => ({ prisma }));

import {
  consumeOneTimeAuthToken,
  issueOneTimeAuthToken,
} from "./one-time-auth";

const NOW = new Date("2026-01-02T03:04:05.000Z");

function transactionWith(row: { id: string; userId: string; expiresAt: Date } | null, deleteCount = 1) {
  const tx = {
    passwordResetToken: {
      findUnique: vi.fn().mockResolvedValue(row),
      deleteMany: vi.fn().mockResolvedValue({ count: deleteCount }),
    },
  };
  prisma.$transaction.mockImplementation(async (callback) => callback(tx));
  return tx;
}

describe("issueOneTimeAuthToken", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    prisma.passwordResetToken.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("creates an expiring purpose-prefixed token and stores only its hash", async () => {
    const token = await issueOneTimeAuthToken("user-1", "native_handoff", 30);

    expect(token).toMatch(/^mfxhandoff_[A-Za-z0-9_-]+$/);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: new Date(NOW.getTime() + 30_000),
      },
    });
    expect(prisma.passwordResetToken.create.mock.calls[0][0].data.tokenHash).not.toBe(token);
  });
});

describe("consumeOneTimeAuthToken", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("claims a valid token by deleting the exact hashed row in a transaction", async () => {
    const row = {
      id: "token-row-1",
      userId: "user-1",
      expiresAt: new Date(NOW.getTime() + 1_000),
    };
    const tx = transactionWith(row);

    await expect(consumeOneTimeAuthToken("  mfx2fa_token  ", "pending_2fa")).resolves.toBe(
      "user-1"
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
      select: { id: true, userId: true, expiresAt: true },
    });

    const tokenHash = tx.passwordResetToken.findUnique.mock.calls[0][0].where.tokenHash;
    expect(tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "token-row-1", tokenHash },
    });
  });

  it("uses purpose as part of the hash domain", async () => {
    const tx = transactionWith(null);

    await consumeOneTimeAuthToken("shared-token", "pending_2fa");
    const pendingHash = tx.passwordResetToken.findUnique.mock.calls[0][0].where.tokenHash;

    await consumeOneTimeAuthToken("shared-token", "native_handoff");
    const handoffHash = tx.passwordResetToken.findUnique.mock.calls[1][0].where.tokenHash;

    expect(pendingHash).not.toBe(handoffHash);
  });

  it("deletes expired rows without returning a user", async () => {
    const tx = transactionWith({
      id: "expired-row",
      userId: "user-1",
      expiresAt: new Date(NOW.getTime() - 1),
    });

    await expect(consumeOneTimeAuthToken("expired-token", "pending_2fa")).resolves.toBeNull();
    expect(tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "expired-row" },
    });
  });

  it("returns null when another consumer wins the delete race", async () => {
    transactionWith(
      {
        id: "token-row-1",
        userId: "user-1",
        expiresAt: new Date(NOW.getTime() + 1_000),
      },
      0
    );

    await expect(consumeOneTimeAuthToken("claimed-token", "pending_2fa")).resolves.toBeNull();
  });
});
