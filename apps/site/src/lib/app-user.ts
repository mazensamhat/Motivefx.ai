import { prisma } from "@motivefx/database";
import { parseUserMarkets } from "./entitlements";
import { getSession } from "./session";
import { userHasActiveSubscription } from "./subscription-access";

export async function getAppUser() {
  const session = await getSession();
  if (!session) return null;

  // Skip Apple IAP columns on the hot path — Stripe status + accessExpiresAt
  // still gate access; Apple-only users are covered once columns are present
  // via /api/app/sync-status and IAP webhooks.
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
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
    },
  });

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
