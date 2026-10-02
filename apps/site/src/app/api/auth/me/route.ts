import { json, unauthorized } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getEffectiveSession } from "@/lib/ops/impersonation";
import { isAdminEmail } from "@/lib/admin";
import { findUserSafeCached } from "@/lib/load-user";
import { userHasActiveSubscription } from "@/lib/subscription-access";
import { isTrustedNativeReaderRequest } from "@/lib/terminal/ios-reader";
import { planForUser, iosAppStoreReaderPlan } from "@/lib/terminal/plan";
import { getSimulationStatus } from "@/lib/terminal/simulation";
import { MODULE_CATALOG, ANNUAL_PRICE_USD } from "@/lib/terminal/modules-catalog";
import { withDeadline } from "@/lib/ask-motive/deadline";

export const dynamic = "force-dynamic";
export const maxDuration = 15;
function parseSelectedMarkets(raw: string | null): string[] {
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}
export async function GET(request: Request) {
  try {
    return await withDeadline(async () => {
      const actor = await getSession();
      if (!actor) return unauthorized();
      const session = await getEffectiveSession();
      if (!session) return unauthorized();
      const user = await findUserSafeCached({ id: session.id });
      if (!user || user.disabledAt) return unauthorized();
      const iosReader = await isTrustedNativeReaderRequest(request);
      const plan = iosReader ? iosAppStoreReaderPlan() : planForUser(user);
      const response = json({ user: {
        id: user.id, email: user.email,
        intelligenceTier: iosReader ? "lite" : user.intelligenceTier,
        selectedMarkets: parseSelectedMarkets(user.selectedMarkets),
        stripeSubscriptionId: iosReader ? null : user.stripeSubscriptionId,
        subscriptionStatus: iosReader ? "none" : user.subscriptionStatus,
        accessExpiresAt: iosReader ? null : user.accessExpiresAt,
        disabledAt: user.disabledAt,
        hasSubscription: iosReader ? false : userHasActiveSubscription(user),
        isAdmin: isAdminEmail(actor.email), totpEnabled: Boolean(user.totpEnabled),
        impersonating: Boolean(session.impersonating),
        operatorEmail: session.impersonating ? actor.email : undefined,
      }, modules: { ...plan, catalog: MODULE_CATALOG, annualPrice: ANNUAL_PRICE_USD,
        simulation: getSimulationStatus(user) } });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }, 6_000, "session-bootstrap", request.signal);
  } catch {
    console.warn("[auth/me] session_lookup_unavailable");
    return Response.json({ error: "Session verification is temporarily unavailable.", code: "session_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3" } });
  }
}
