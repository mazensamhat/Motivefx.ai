import { prisma } from "@motivefx/database";
import { json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { isPrismaMissingColumnError } from "@/lib/load-user";
import { userHasActiveSubscription } from "@/lib/subscription-access";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const selectWithApple = {
    id: true,
    email: true,
    intelligenceTier: true,
    selectedMarkets: true,
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

  if (!user || user.disabledAt) return unauthorized();

  return json({
    user: {
      ...user,
      selectedMarkets: user.selectedMarkets ? JSON.parse(user.selectedMarkets) : [],
      hasSubscription: userHasActiveSubscription(user),
      isAdmin: isAdminEmail(user.email),
      totpEnabled: Boolean(user.totpEnabled),
    },
  });
}
