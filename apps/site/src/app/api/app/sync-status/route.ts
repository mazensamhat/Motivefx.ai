import { prisma } from "@motivefx/database";
import { json, unauthorized } from "@/lib/api";
import { getBackendSession } from "@/lib/backend";
import { backendModulesForSiteUser } from "@/lib/site-briefing";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { userHasActiveSubscription } from "@/lib/subscription-access";
import type { IntelligenceMarketId, PricingTierId } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { email: session.email.trim().toLowerCase() },
    select: {
      email: true,
      intelligenceTier: true,
      selectedMarkets: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      accessExpiresAt: true,
      disabledAt: true,
    },
  });
  if (!user) return unauthorized();

  const backend = await getBackendSession(user.email, { force: true });
  const selected = (() => {
    try {
      return JSON.parse(user.selectedMarkets ?? "[]") as IntelligenceMarketId[];
    } catch {
      return [] as IntelligenceMarketId[];
    }
  })();

  return json({
    ok: true,
    site: {
      email: user.email,
      tier: user.intelligenceTier,
      subscriptionStatus: user.subscriptionStatus,
      hasSubscription: userHasActiveSubscription(user),
      allowedModules: userHasActiveSubscription(user)
        ? backendModulesForSiteUser(user.intelligenceTier as PricingTierId, selected)
        : [],
      isAdmin: isAdminEmail(user.email),
    },
    backend: backend
      ? {
          userId: backend.userId,
          entitlementsSynced: backend.entitlementsSynced !== false,
          reachable: true,
        }
      : {
          reachable: false,
          entitlementsSynced: false,
        },
    hint: backend
      ? backend.entitlementsSynced === false
        ? "Render reachable but entitlement sync failed — check Render logs for sync-site-user errors."
        : null
      : "Vercel cannot reach Render. Verify MOTIVEFX_API_URL (no trailing slash) and BACKEND_SYNC_SECRET matches on both Vercel and Render.",
  });
}
