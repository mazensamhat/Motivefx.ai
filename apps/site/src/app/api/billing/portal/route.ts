import { prisma } from "@motivefx/database";
import { badRequest, json, serverError } from "@/lib/api";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return badRequest("Stripe is not configured.");
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Valid email required.");

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return badRequest("No billing account found for this email.");
    }

    const stripe = getStripe()!;
    const appUrl = getAppUrl();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/pricing`,
    });

    return json({ url: portal.url });
  } catch (error) {
    console.error("[api/billing/portal]", error);
    return serverError("Could not open billing portal.");
  }
}
