import { prisma } from "@motivefx/database";
import type { Prisma, User } from "@prisma/client";

/** Columns that existed before the Apple IAP migration (20260715_apple_iap). */
const LEGACY_USER_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  displayName: true,
  intelligenceTier: true,
  selectedMarkets: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionStatus: true,
  accessExpiresAt: true,
  disabledAt: true,
  signupCountry: true,
  signupRegion: true,
  signupCity: true,
  signupLatitude: true,
  signupLongitude: true,
  acquisitionChannel: true,
  simTrialStartedAt: true,
  simBankroll: true,
  termsAcceptedAt: true,
  privacyAcceptedAt: true,
  lastSeenAt: true,
  totpSecret: true,
  totpEnabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const APPLE_IAP_COLUMNS = [
  "billingProvider",
  "appleOriginalTransactionId",
  "appleProductId",
  "revenueCatAppUserId",
] as const;

export function isPrismaMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "P2022") return true;
  const msg = String(e.message ?? "");
  return (
    msg.includes("does not exist in the current database") ||
    /column .* does not exist/i.test(msg)
  );
}

function withNullAppleFields<T extends Record<string, unknown>>(row: T): User {
  return {
    ...row,
    billingProvider: null,
    appleOriginalTransactionId: null,
    appleProductId: null,
    revenueCatAppUserId: null,
  } as unknown as User;
}

/**
 * Load a full User row. If production DB is behind the Prisma schema
 * (missing Apple IAP columns), fall back to a legacy column set so login
 * and the terminal stay usable instead of 500ing.
 */
export async function findUserSafe(
  where: Prisma.UserWhereUniqueInput
): Promise<User | null> {
  try {
    return await prisma.user.findUnique({ where });
  } catch (error) {
    if (!isPrismaMissingColumnError(error)) throw error;
    const row = await prisma.user.findUnique({
      where,
      select: LEGACY_USER_SELECT,
    });
    return row ? withNullAppleFields(row) : null;
  }
}

export async function checkAppleIapSchema(): Promise<{
  ok: boolean;
  missing: string[];
}> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'User'
         AND column_name IN (
           'billingProvider',
           'appleOriginalTransactionId',
           'appleProductId',
           'revenueCatAppUserId'
         )`
    );
    const found = new Set(rows.map((r) => r.column_name));
    const missing = APPLE_IAP_COLUMNS.filter((c) => !found.has(c));
    return { ok: missing.length === 0, missing: [...missing] };
  } catch {
    return { ok: false, missing: [...APPLE_IAP_COLUMNS] };
  }
}
