import { json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { findUserSafeCached } from "@/lib/load-user";
import { userHasActiveSubscription } from "@/lib/subscription-access";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  // Cached legacy select — avoid Apple columns + pool thrash under parallel boot.
  const user = await findUserSafeCached({ id: session.id });
  if (!user || user.disabledAt) return unauthorized();

  return json({
    user: {
      id: user.id,
      email: user.email,
      intelligenceTier: user.intelligenceTier,
      selectedMarkets: user.selectedMarkets ? JSON.parse(user.selectedMarkets) : [],
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      accessExpiresAt: user.accessExpiresAt,
      disabledAt: user.disabledAt,
      hasSubscription: userHasActiveSubscription(user),
      isAdmin: isAdminEmail(user.email),
      totpEnabled: Boolean(user.totpEnabled),
    },
  });
}
