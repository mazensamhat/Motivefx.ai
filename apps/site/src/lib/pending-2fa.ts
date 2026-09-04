import {
  consumeOneTimeAuthToken,
  issueOneTimeAuthToken,
} from "@/lib/one-time-auth";

const PENDING_2FA_DURATION = 60 * 10;

/**
 * Create a durable one-time challenge. Unlike the old signed-only token, this
 * cannot be replayed and it does not permit unlimited TOTP guesses for 10 minutes.
 */
export async function createPending2faToken(userId: string): Promise<string> {
  return issueOneTimeAuthToken(userId, "pending_2fa", PENDING_2FA_DURATION);
}

/**
 * Claim the challenge before checking TOTP. A wrong code therefore consumes the
 * challenge and requires the primary password again, sharply limiting online guesses.
 */
export async function verifyPending2faToken(token: string): Promise<string> {
  const userId = await consumeOneTimeAuthToken(token, "pending_2fa");
  if (!userId) throw new Error("Invalid or expired verification token.");
  return userId;
}
