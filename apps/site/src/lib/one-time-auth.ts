import { createHash, randomBytes } from "crypto";
import { prisma } from "@motivefx/database";

export type OneTimeAuthPurpose = "pending_2fa" | "native_handoff";

function hashToken(purpose: OneTimeAuthPurpose, token: string): string {
  return createHash("sha256").update(`${purpose}:${token}`).digest("hex");
}

function tokenPrefix(purpose: OneTimeAuthPurpose): string {
  return purpose === "pending_2fa" ? "mfx2fa_" : "mfxhandoff_";
}

/**
 * Durable, opaque, single-use auth token backed by the existing token table.
 * Purpose is included in the hash domain so these records cannot be consumed by
 * the password-reset flow even though they share the same storage table.
 */
export async function issueOneTimeAuthToken(
  userId: string,
  purpose: OneTimeAuthPurpose,
  ttlSeconds: number
): Promise<string> {
  const token = `${tokenPrefix(purpose)}${randomBytes(32).toString("base64url")}`;
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(purpose, token),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
  });
  return token;
}

/** Atomically claim a token. Only one concurrent consumer can receive userId. */
export async function consumeOneTimeAuthToken(
  token: string,
  purpose: OneTimeAuthPurpose
): Promise<string | null> {
  const tokenHash = hashToken(purpose, token.trim());
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const row = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!row || row.expiresAt <= now) {
      if (row) {
        await tx.passwordResetToken.deleteMany({ where: { id: row.id } });
      }
      return null;
    }

    const claimed = await tx.passwordResetToken.deleteMany({
      where: { id: row.id, tokenHash },
    });
    return claimed.count === 1 ? row.userId : null;
  });
}
