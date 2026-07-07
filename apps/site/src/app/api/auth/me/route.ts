import { prisma } from "@motivefx/database";
import { json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { userHasActiveSubscription } from "@/lib/subscription-access";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      intelligenceTier: true,
      selectedMarkets: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      accessExpiresAt: true,
      disabledAt: true,
    },
  });

  if (!user || user.disabledAt) return unauthorized();

  return json({
    user: {
      ...user,
      selectedMarkets: user.selectedMarkets ? JSON.parse(user.selectedMarkets) : [],
      hasSubscription: userHasActiveSubscription(user),
    },
  });
}