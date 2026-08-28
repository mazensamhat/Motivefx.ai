import { prisma } from "@motivefx/database";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { getSession } from "@/lib/session";
import { getActiveImpersonation } from "@/lib/ops/impersonation";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return badRequest("Stripe is not configured.");
    }

    const session = await getSession();
    if (session && (await getActiveImpersonation(session.id))) {
      return forbidden("Billing changes are blocked while impersonating.");
    }
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    const email = (session?.email ?? parsed.data?.email)?.trim().toLowerCase();
    if (!email) return unauthorized("Sign in to manage billing.");

    const user = await prisma.user.findUnique({
      where: { email },
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