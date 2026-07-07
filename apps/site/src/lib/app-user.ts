import { prisma } from "@motivefx/database";
import { parseUserMarkets } from "./entitlements";
import { getSession } from "./session";

export async function getAppUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      intelligenceTier: true,
      selectedMarkets: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    tier: user.intelligenceTier,
    markets: parseUserMarkets(user.selectedMarkets),
    hasSubscription: Boolean(user.stripeSubscriptionId),
    hasBillingAccount: Boolean(user.stripeCustomerId),
  };
}
