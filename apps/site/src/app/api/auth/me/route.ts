import { json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getEffectiveSession } from "@/lib/ops/impersonation";
import { isAdminEmail } from "@/lib/admin";
import { findUserSafeCached } from "@/lib/load-user";
import { userHasActiveSubscription } from "@/lib/subscription-access";
import { isTrustedNativeReaderRequest } from "@/lib/terminal/ios-reader";

function parseSelectedMarkets(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    // Legacy/manual rows should not make /auth/me fail and strand the entire app boot.
    return [];
  }
}

export async function GET(request: Request) {
  const actor = await getSession();
  if (!actor) return unauthorized();

  const session = await getEffectiveSession();
  if (!session) return unauthorized();

  // Cached legacy select — avoid Apple columns + pool thrash under parallel boot.
  const user = await findUserSafeCached({ id: session.id });
  if (!user || user.disabledAt) return unauthorized();

  // iOS App Store free reader: never surface web/Stripe paid flags to the shell.
  const iosReader = await isTrustedNativeReaderRequest(request);

  return json({
    user: {
      id: user.id,
      email: user.email,
      intelligenceTier: iosReader ? "lite" : user.intelligenceTier,
      selectedMarkets: parseSelectedMarkets(user.selectedMarkets),
      stripeSubscriptionId: iosReader ? null : user.stripeSubscriptionId,
      subscriptionStatus: iosReader ? "none" : user.subscriptionStatus,
      accessExpiresAt: iosReader ? null : user.accessExpiresAt,
      disabledAt: user.disabledAt,
      hasSubscription: iosReader ? false : userHasActiveSubscription(user),
      isAdmin: isAdminEmail(actor.email),
      totpEnabled: Boolean(user.totpEnabled),
      impersonating: Boolean(session.impersonating),
      operatorEmail: session.impersonating ? actor.email : undefined,
    },
  });
}
