import { prisma } from "@motivefx/database";
import { parseUserMarkets } from "./entitlements";
import { isPrismaMissingColumnError } from "./load-user";
import { getSession } from "./session";
import { userHasActiveSubscription } from "./subscription-access";

export async function getAppUser() {
  const session = await getSession();
  if (!session) return null;

  const selectWithApple = {
    id: true,
    email: true,
    intelligenceTier: true,
    selectedMarkets: true,
    stripeCustomerId: true,
    stripeSubscriptionId: true,
    appleOriginalTransactionId: true,
    billingProvider: true,
    subscriptionStatus: true,
    accessExpiresAt: true,
    disabledAt: true,
    totpEnabled: true,
  } as const;

  const selectLegacy = {
    id: true,
    email: true,
    intelligenceTier: true,
    selectedMarkets: true,
    stripeCustomerId: true,
    stripeSubscriptionId: true,
    subscriptionStatus: true,
    accessExpiresAt: true,
    disabledAt: true,
    totpEnabled: true,
  } as const;

  let user: {
    id: string;
    email: string;
    intelligenceTier: string;
    selectedMarkets: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    appleOriginalTransactionId?: string | null;
    billingProvider?: string | null;
    subscriptionStatus: string;
    accessExpiresAt: Date | null;
    disabledAt: Date | null;
    totpEnabled: boolean;
  } | null;

  try {
    user = await prisma.user.findUnique({
      where: { id: session.id },
      select: selectWithApple,
    });
  } catch (error) {
    if (!isPrismaMissingColumnError(error)) throw error;
    user = await prisma.user.findUnique({
      where: { id: session.id },
      select: selectLegacy,
    });
  }

  if (!user || user.disabledAt) return null;

  return {
    id: user.id,
    email: user.email,
    tier: user.intelligenceTier,
    markets: parseUserMarkets(user.selectedMarkets),
    hasSubscription: userHasActiveSubscription(user),
    hasBillingAccount: Boolean(user.stripeCustomerId),
    totpEnabled: Boolean(user.totpEnabled),
  };
}
