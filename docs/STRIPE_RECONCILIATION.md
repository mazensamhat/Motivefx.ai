# Stripe webhook reconciliation

Webhook snapshots may be duplicated and delivered out of order. This handler
retrieves the current Checkout, Subscription or Invoice object and uses the
existing stored customer/subscription ownership mapping. Metadata cannot transfer
billing to another MotiveFX account.

## Implemented behavior

- Checkout requires a complete subscription session with `paid` or
  `no_payment_required` status; asynchronous success uses the same path.
- A new active subscription requires a currently paid initial invoice. A trial
  can activate without an initial charge. Existing past-due grace behavior is
  preserved; this release does not invent a dunning/refund policy.
- A per-user database row lock serializes reconciliation. The Subscription is
  read again after the lock. Transactional, unique event receipts use the
  existing Ops audit table, so a failed update does not acknowledge the event.
- Applied receipts retain subscription creation provenance. An older or tied
  competing subscription cannot replace a newer one, including after the newer
  subscription is cancelled and its current ID is cleared. An existing attached
  subscription is also checked before the first new receipt is available.
- Comp access, operator pauses and another billing store retain ownership.
  Inactive events only clear the currently attached Stripe subscription.
- Invoice paid/failure and subscription pause/resume events reconcile current
  state. Provider/database failures return a retryable failure, not success.
- Refund, dispute and early-fraud-warning events create deduplicated Ops review
  evidence. They do not automatically refund, cancel or change access.
- Post-checkout account setup has a unique durable business-event claim and
  provider idempotency key. A retry cannot generate a different password token
  or send again for the same checkout. A separate setup token preserves other
  in-flight reset/2FA/handoff tokens. Accepted means provider acceptance only.
- Ambiguous or interrupted setup sends remain unknown/processing for operational
  reconciliation. The customer's normal password-reset flow is the recovery
  path; the webhook does not blindly resend. No token/link is logged.
- Restricted server keys are supported with their existing permissions. No
  credential or Stripe endpoint configuration is changed by this release.

## Remaining production acceptance

The implementation tests use real Stripe signature verification and provider/DB
doubles. No live charge, provider send or customer mutation was performed during
verification. Confirm actual event subscriptions in the existing Stripe endpoint
before claiming new event coverage is receiving production traffic. Required
handler events are checkout completion/async success, subscription created,
updated, deleted, paused and resumed, invoice paid/payment failed, and the three
risk events above. Configure only events the handler acts on.

Run a controlled sandbox lifecycle for paid, trial, delayed payment, renewal,
failed payment, cancellation, duplicate and reversed event delivery; inspect the
receipt and entitlement state. A production log alone is not that acceptance.
The existing API version/SDK contract is retained for this bounded repair; a
major-version upgrade requires its own compatibility acceptance.

Risk-event evidence still needs an operational owner and an explicit response
policy. No live refund, dispute response, tax registration, automatic-tax setting,
price or subscription configuration is changed. Tax configuration and jurisdiction
review remain separate launch prerequisites; enabling a flag is not evidence of
a valid tax registration.

## Verification

`node --test tests/stripe-reconciliation.test.mjs tests/auth-billing-database.test.mjs`

The consolidated regression workflow includes these tests. See
[Stripe webhook delivery](https://docs.stripe.com/webhooks),
[subscription events](https://docs.stripe.com/billing/subscriptions/webhooks), and
[Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment).
