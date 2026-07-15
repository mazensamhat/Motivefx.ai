import { prisma } from "@motivefx/database";
import { json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { isPrismaMissingColumnError } from "@/lib/load-user";
import { userHasActiveSubscription } from "@/lib/subscription-access";
import { backendModulesForTier } from "@/lib/terminal/plan";
import type { IntelligenceMarketId, PricingTierId } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const selectWithApple = {
    id: true,
    email: true,
    intelligenceTier: true,
    selectedMarkets: true,
    subscriptionStatus: true,
    stripeSubscriptionId: true,
    appleOriginalTransactionId: true,
    billingProvider: true,
    accessExpiresAt: true,
    disabledAt: true,
  } as const;

  const selectLegacy = {
    id: true,
    email: true,
    intelligenceTier: true,
    selectedMarkets: true,
    subscriptionStatus: true,
    stripeSubscriptionId: true,
    accessExpiresAt: true,
    disabledAt: true,
  } as const;

  let user: {
    id: string;
    email: string;
    intelligenceTier: string;
    selectedMarkets: string | null;
    subscriptionStatus: string;
    stripeSubscriptionId: string | null;
    appleOriginalTransactionId?: string | null;
    billingProvider?: string | null;
    accessExpiresAt: Date | null;
    disabledAt: Date | null;
  } | null;

  try {
    user = await prisma.user.findUnique({
      where: { email: session.email.trim().toLowerCase() },
      select: selectWithApple,
    });
  } catch (error) {
    if (!isPrismaMissingColumnError(error)) throw error;
    user = await prisma.user.findUnique({
      where: { email: session.email.trim().toLowerCase() },
      select: selectLegacy,
    });
  }
  if (!user) return unauthorized();

  const selected = (() => {
    try {
      return JSON.parse(user.selectedMarkets ?? "[]") as IntelligenceMarketId[];
    } catch {
      return [] as IntelligenceMarketId[];
    }
  })();

  const hasSubscription = userHasActiveSubscription(user);

  return json({
    ok: true,
    site: {
      userId: user.id,
      email: user.email,
      tier: user.intelligenceTier,
      subscriptionStatus: user.subscriptionStatus,
      hasSubscription,
      allowedModules: hasSubscription
        ? backendModulesForTier(user.intelligenceTier as PricingTierId, selected)
        : [],
      isAdmin: isAdminEmail(user.email),
    },
  });
}
