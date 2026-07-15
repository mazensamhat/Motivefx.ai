import { prisma } from "@motivefx/database";
import { getStripe } from "@/lib/stripe";
import { json, serverError } from "@/lib/api";
import type Stripe from "stripe";
import type { PricingTierId } from "@/lib/tiers";

export const runtime = "nodejs";

async function activateTier(
  userId: string,
  tier: PricingTierId,
  selectedMarkets: string | null,
  subscriptionId: string,
  customerId?: string | null
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  // Ops-granted comp access must not be overwritten by Stripe subscription events.
  if (existing?.subscriptionStatus === "comp") return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      intelligenceTier: tier,
      selectedMarkets,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: "active",
      billingProvider: "stripe",
      // Clear Apple ids so we don't treat this as Apple-managed billing.
      appleOriginalTransactionId: null,
      appleProductId: null,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    },
  });
}

async function deactivateTier(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  if (existing?.subscriptionStatus === "comp") return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      intelligenceTier: "lite",
      stripeSubscriptionId: null,
      subscriptionStatus: "none",
      billingProvider: null,
    },
  });
}

async function resolveUserIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.userId) return sub.metadata.userId;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function resolveUserIdFromCheckout(session: Stripe.Checkout.Session): Promise<string | null> {
  if (session.metadata?.userId) return session.metadata.userId;

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) return null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

function tierFromMetadata(meta: Stripe.Metadata | null | undefined): PricingTierId | null {
  const tier = meta?.tier;
  if (
    tier === "lite" ||
    tier === "pro" ||
    tier === "ultra" ||
    tier === "ultra_plus" ||
    tier === "elite"
  ) {
    return tier;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !webhookSecret || webhookSecret.includes("...")) {
      return json({ error: "Stripe webhook not configured" }, 503);
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) return json({ error: "Missing signature" }, 400);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return json({ error: "Invalid signature" }, 400);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const userId = await resolveUserIdFromCheckout(checkoutSession);
        const subId =
          typeof checkoutSession.subscription === "string"
            ? checkoutSession.subscription
            : checkoutSession.subscription?.id;
        const customerId =
          typeof checkoutSession.customer === "string"
            ? checkoutSession.customer
            : checkoutSession.customer?.id;
        const tier = tierFromMetadata(checkoutSession.metadata);
        const selectedMarkets = checkoutSession.metadata?.selectedMarkets ?? null;
        if (userId && subId && tier) {
          await activateTier(userId, tier, selectedMarkets, subId, customerId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(sub);
        if (!userId) break;
        const tier = tierFromMetadata(sub.metadata);
        const selectedMarkets = sub.metadata?.selectedMarkets ?? null;
        if (sub.status === "active" || sub.status === "trialing") {
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (tier) {
            await activateTier(userId, tier, selectedMarkets, sub.id, customerId);
          }
        } else if (sub.status === "canceled" || sub.status === "unpaid") {
          await deactivateTier(userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(sub);
        if (userId) await deactivateTier(userId);
        break;
      }
      default:
        break;
    }

    return json({ received: true, status: "success" });
  } catch (error) {
    console.error("[api/webhooks/stripe]", error);
    return serverError("Webhook handler failed.");
  }
}
