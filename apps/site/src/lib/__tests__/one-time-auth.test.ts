import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

const db = vi.hoisted(() => {
  const records = new Map<string, TokenRecord>();

  const passwordResetToken = {
    create: vi.fn(async ({ data }: { data: Omit<TokenRecord, "id"> }) => {
      const record: TokenRecord = {
        id: `token_${records.size + 1}`,
        ...data,
      };
      records.set(record.tokenHash, record);
      return record;
    }),
    findUnique: vi.fn(
      async ({ where }: { where: { tokenHash: string } }) =>
        records.get(where.tokenHash) ?? null
    ),
    deleteMany: vi.fn(
      async ({
        where,
      }: {
        where: { id?: string; tokenHash?: string };
      }) => {
        let deleted = 0;
        for (const [tokenHash, record] of records) {
          if (where.id && record.id !== where.id) continue;
          if (where.tokenHash && record.tokenHash !== where.tokenHash) continue;
          records.delete(tokenHash);
          deleted += 1;
        }
        return { count: deleted };
      }
    ),
  };

  return {
    records,
    prisma: {
      passwordResetToken,
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback({ passwordResetToken })
      ),
    },
  };
});

vi.mock("@motivefx/database", () => ({
  prisma: db.prisma,
}));

import {
  consumeOneTimeAuthToken,
  issueOneTimeAuthToken,
} from "../one-time-auth";

const BASE_TIME = new Date("2026-09-06T12:00:00.000Z");

describe("one-time auth tokens", () => {
  beforeEach(() => {
    db.records.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("issues native handoff tokens that are purpose-bound and single-use", async () => {
    const token = await issueOneTimeAuthToken("user_123", "native_handoff", 120);

    expect(token).toMatch(/^mfxhandoff_/);
    expect(db.records.size).toBe(1);
    const [record] = [...db.records.values()];
    expect(record.userId).toBe("user_123");
    expect(record.tokenHash).not.toContain(token);
    expect(record.expiresAt).toEqual(new Date(BASE_TIME.getTime() + 120_000));

    await expect(consumeOneTimeAuthToken(token, "pending_2fa")).resolves.toBeNull();
    expect(db.records.size).toBe(1);

    await expect(
      consumeOneTimeAuthToken(`  ${token}  `, "native_handoff")
    ).resolves.toBe("user_123");
    await expect(consumeOneTimeAuthToken(token, "native_handoff")).resolves.toBeNull();
    expect(db.records.size).toBe(0);
  });

  it("deletes expired challenges without returning a user", async () => {
    const token = await issueOneTimeAuthToken("user_456", "pending_2fa", 60);

    vi.setSystemTime(new Date(BASE_TIME.getTime() + 60_001));

    await expect(consumeOneTimeAuthToken(token, "pending_2fa")).resolves.toBeNull();
    expect(db.records.size).toBe(0);
  });
});
