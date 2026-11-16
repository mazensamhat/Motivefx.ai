import { getStripe } from "@/lib/stripe";
import { json, serverError } from "@/lib/api";
import { checkoutMayFulfill, reconcileStripeSubscription, recordStripeRiskEvent, stripeObjectId } from "@/lib/stripe-reconciliation";
import { sendCheckoutAccountSetup } from "@/lib/checkout-account-setup";
import type Stripe from "stripe";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !webhookSecret || webhookSecret.includes("...")) return json({ error: "Stripe webhook not configured" }, 503);
    const signature = request.headers.get("stripe-signature");
    if (!signature) return json({ error: "Missing signature" }, 400);
    const body = await request.text();
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(body, signature, webhookSecret); }
    catch { return json({ error: "Invalid signature" }, 400); }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const hint = event.data.object as Stripe.Checkout.Session;
        const session = await stripe.checkout.sessions.retrieve(hint.id, {}, { timeout: 4000, maxNetworkRetries: 0 });
        const subId = stripeObjectId(session.subscription);
        if (!checkoutMayFulfill(session) || !subId) break;
        const result = await reconcileStripeSubscription(stripe, subId, event.id);
        if (result.activated) await sendCheckoutAccountSetup(result.userId, session.id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const hint = event.data.object as Stripe.Subscription;
        await reconcileStripeSubscription(stripe, hint.id, event.id);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const hint = event.data.object as Stripe.Invoice;
        if (!hint.id) throw new Error("stripe_invoice_id_missing");
        const invoice = await stripe.invoices.retrieve(hint.id, {}, { timeout: 4000, maxNetworkRetries: 0 });
        const subId = stripeObjectId(invoice.parent?.subscription_details?.subscription);
        if (subId) await reconcileStripeSubscription(stripe, subId, event.id);
        break;
      }
      case "charge.dispute.created":
      case "charge.refunded":
      case "radar.early_fraud_warning.created":
        await recordStripeRiskEvent(event);
        break;
      default: break;
    }
    return json({ received: true, status: "success" });
  } catch {
    // Do not include raw provider objects, customer details or secrets in logs.
    console.error("[api/webhooks/stripe] reconciliation failed; provider retry required");
    return serverError("Webhook handler failed.");
  }
}
