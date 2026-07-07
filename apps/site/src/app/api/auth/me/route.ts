import { prisma } from "@motivefx/database";
import { json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";

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
    },
  });

  if (!user) return unauthorized();

  return json({
    user: {
      ...user,
      selectedMarkets: user.selectedMarkets ? JSON.parse(user.selectedMarkets) : [],
      hasSubscription: Boolean(user.stripeSubscriptionId),
    },
  });
}
