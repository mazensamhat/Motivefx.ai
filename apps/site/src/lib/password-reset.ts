import { createHash, randomBytes } from "crypto";
import { prisma } from "@motivefx/database";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export async function issuePasswordResetToken(userId: string) {
  const { token, tokenHash } = createPasswordResetToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

/**
 * Atomically claim a valid reset token.
 *
 * Looking a token up and deleting it later creates a race where two concurrent
 * requests can both reset the same account. We first read the owner, then use a
 * conditional delete as the compare-and-swap. Exactly one caller can delete the
 * row and receive the user id; every concurrent/replayed caller gets null.
 */
export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!record || record.expiresAt <= now) {
    if (record) {
      await prisma.passwordResetToken.deleteMany({ where: { id: record.id } });
    }
    return null;
  }

  const claimed = await prisma.passwordResetToken.deleteMany({
    where: {
      id: record.id,
      tokenHash,
      expiresAt: { gt: now },
    },
  });

  return claimed.count === 1 ? record.userId : null;
}

export async function clearPasswordResetTokens(userId: string) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
}
