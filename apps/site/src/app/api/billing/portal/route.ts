import { prisma } from "@motivefx/database";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { getSession } from "@/lib/session";
import { getActiveImpersonation } from "@/lib/ops/impersonation";
import { findUserSafeCached } from "@/lib/load-user";

export async function POST() {
  try {
    if (!isStripeConfigured()) {
      return badRequest("Stripe is not configured.");
    }

    // Billing portal access is credentialed account access. Never fall back to
    // a caller-supplied email address: anyone who knows a customer's email could
    // otherwise mint a Stripe portal session for that account.
    const session = await getSession();
    if (!session) return unauthorized("Sign in to manage billing.");

    if (await getActiveImpersonation(session.id)) {
      return forbidden("Billing changes are blocked while impersonating.");
    }

    const currentUser = await findUserSafeCached({ id: session.id }, { timeoutMs: 5_000 });
    if (!currentUser || currentUser.disabledAt) {
      return unauthorized("Sign in to manage billing.");
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return badRequest("No active subscription found. Subscribe on Pricing first.");
    }

    const stripe = getStripe()!;
    const appUrl = getAppUrl();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/app/settings`,
    });

    return json({ url: portal.url });
  } catch (error) {
    console.error("[api/billing/portal]", error);
    return serverError("Could not open billing portal.");
  }
}
