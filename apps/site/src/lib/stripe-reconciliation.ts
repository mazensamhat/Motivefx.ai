import { createHash } from "crypto";
import type Stripe from "stripe";
import { prisma } from "@motivefx/database";
import { invalidateUserCache } from "./load-user";
import { validateSelectedMarkets, type IntelligenceMarketId, type PricingTierId } from "./tiers";

const READ_OPTIONS = { timeout: 4000, maxNetworkRetries: 0 };
const ACTION = "billing.stripe.reconciled";
export function stripeObjectId(value: string | { id?: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}
export function stripeReceiptId(eventId: string): string {
  return `stripe-event:${createHash("sha256").update(eventId).digest("hex")}`;
}
export function checkoutMayFulfill(session: Pick<Stripe.Checkout.Session, "mode" | "status" | "payment_status">): boolean {
  return session.mode === "subscription" && session.status === "complete" &&
    (session.payment_status === "paid" || session.payment_status === "no_payment_required");
}
function tierFromMetadata(meta: Stripe.Metadata): PricingTierId | null {
  const tier = meta.tier;
  return ["lite", "pro", "ultra", "ultra_plus", "elite"].includes(tier ?? "") ? tier as PricingTierId : null;
}
function auditBase(eventId: string, userId: string, reason: string) {
  return { id: stripeReceiptId(eventId), actorId: "stripe_webhook", actorEmail: "stripe-webhook@motivefx.local",
    action: ACTION, risk: "LOW", targetType: "user", targetId: userId, reason,
    environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || "unknown", requestId: eventId };
}

/** Read the current provider object, then serialize reconciliation on the owning
 * user row. Event snapshots are notifications, not entitlement authority. */
export async function reconcileStripeSubscription(stripe: Stripe, subscriptionId: string, eventId: string) {
  const hint = await stripe.subscriptions.retrieve(subscriptionId, {}, READ_OPTIONS);
  const customerId = stripeObjectId(hint.customer);
  if (!customerId) throw new Error("stripe_subscription_customer_missing");
  const owners = await prisma.user.findMany({
    where: { OR: [{ stripeSubscriptionId: subscriptionId }, { stripeCustomerId: customerId }] },
    select: { id: true, stripeCustomerId: true }, take: 2,
  });
  // Metadata cannot transfer a subscription to another account. Checkout saves
  // the customer mapping before creating its session, so an unmapped event can
  // safely retry until that mapping is available.
  if (owners.length !== 1 || owners[0]!.stripeCustomerId !== customerId) throw new Error("stripe_owner_unresolved");
  const userId = owners[0]!.id;
  if (hint.metadata.userId && hint.metadata.userId !== userId) throw new Error("stripe_owner_mismatch");

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const receipt = await tx.opsAuditEvent.findUnique({ where: { id: stripeReceiptId(eventId) }, select: { id: true } });
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("stripe_owner_missing");
    // Read again after taking the lock: two in-flight events must not fetch old
    // state concurrently and overwrite a newer reconciliation in reverse order.
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {}, READ_OPTIONS);
    if (stripeObjectId(sub.customer) !== user.stripeCustomerId || (sub.metadata.userId && sub.metadata.userId !== user.id)) throw new Error("stripe_owner_changed");
    if (receipt) return { userId, activated: user.billingProvider === "stripe" && user.stripeSubscriptionId === sub.id && user.subscriptionStatus === "active" && (sub.status === "active" || sub.status === "trialing"), duplicate: true, changed: false };
    const snapshot = { subscriptionId: sub.id, subscriptionCreated: sub.created, status: sub.status };
    let reason = "status_preserved", changed = false, activated = false;
    const latest = await tx.$queryRaw<Array<{ afterJson: string }>>`
      SELECT "afterJson" FROM "OpsAuditEvent"
      WHERE "action" = ${ACTION} AND "targetId" = ${userId} AND "result" = 'applied'
      ORDER BY ("afterJson"::jsonb->>'subscriptionCreated')::bigint DESC, "observedAt" DESC LIMIT 1`;
    const prior = latest[0] ? JSON.parse(latest[0].afterJson) as { subscriptionId: string; subscriptionCreated: number } : null;
    const replaced = prior && prior.subscriptionId !== sub.id && prior.subscriptionCreated >= sub.created;
    if (user.subscriptionStatus === "comp" || user.subscriptionStatus === "paused") reason = "operator_access_preserved";
    else if (user.billingProvider && user.billingProvider !== "stripe") reason = "other_store_preserved";
    else if (replaced) reason = "older_subscription_ignored";
    else if (sub.status === "active" || sub.status === "trialing") {
      // Existing ownership is also checked before the first reconciliation has
      // established the append-only ordering ledger.
      if (user.stripeSubscriptionId && user.stripeSubscriptionId !== sub.id) {
        const current = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {}, READ_OPTIONS);
        if (current.created >= sub.created) reason = "older_subscription_ignored";
      }
      if (reason !== "older_subscription_ignored" && sub.status === "active" && !(user.billingProvider === "stripe" && user.stripeSubscriptionId === sub.id && user.subscriptionStatus === "active")) {
        const invoiceId = stripeObjectId(sub.latest_invoice);
        const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId, {}, READ_OPTIONS) : null;
        if (invoice?.status !== "paid") reason = "initial_payment_unconfirmed";
      }
      if (reason !== "older_subscription_ignored" && reason !== "initial_payment_unconfirmed") {
        const tier = tierFromMetadata(sub.metadata);
        if (!tier) throw new Error("stripe_tier_unresolved");
        const selected = JSON.parse(sub.metadata.selectedMarkets ?? "[]") as IntelligenceMarketId[];
        const markets = validateSelectedMarkets(tier, selected);
        await tx.user.update({ where: { id: userId }, data: {
          intelligenceTier: tier, selectedMarkets: JSON.stringify(markets), stripeSubscriptionId: sub.id,
          subscriptionStatus: "active", billingProvider: "stripe", stripeCustomerId: customerId,
          appleOriginalTransactionId: null, appleProductId: null,
        } });
        reason = "current_subscription_active"; changed = true; activated = true;
      }
    } else if (["canceled", "unpaid", "incomplete_expired", "paused"].includes(sub.status) && user.billingProvider === "stripe" && user.stripeSubscriptionId === sub.id) {
      await tx.user.update({ where: { id: userId }, data: {
        intelligenceTier: "lite", stripeSubscriptionId: null, subscriptionStatus: "none", billingProvider: null,
      } });
      reason = "current_subscription_inactive"; changed = true;
    }
    await tx.opsAuditEvent.create({ data: { ...auditBase(eventId, userId, reason),
      result: changed ? "applied" : "ignored", afterJson: JSON.stringify(snapshot), observedAt: new Date() } });
    return { userId, activated, duplicate: false, changed };
  }, { maxWait: 2000, timeout: 15000 });
  if (result.changed) invalidateUserCache(userId);
  return result;
}

/** Risk events are recorded for human reconciliation. A refund, dispute or early
 * warning does not by itself define the product's entitlement/refund policy. */
export async function recordStripeRiskEvent(event: Stripe.Event) {
  const object = event.data.object as { id?: string; object?: string };
  try {
    await prisma.opsAuditEvent.create({ data: { ...auditBase(event.id, object.id ?? event.id, event.type),
      action: "billing.stripe.risk_review_required", risk: "HIGH", targetType: object.object ?? "stripe_object",
      result: "review_required", afterJson: JSON.stringify({ eventType: event.type, objectId: object.id, livemode: event.livemode }) } });
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
  }
}
