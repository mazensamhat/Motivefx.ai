# Transactional PostgreSQL acceptance

## What this verifies

`tests/postgres/transactional-foundations.mjs` runs the actual application functions and generated Prisma client against disposable PostgreSQL. It creates a baseline from the current Prisma model, removes only the new notification/verification tables in that disposable baseline, and applies the actual staged migration files. This exposes differences that `db push` or an in-memory database double could hide.

The suite refuses to start unless `MOTIVEFX_DISPOSABLE_DB=1`, both database URLs match, the host is loopback, and the database name is exactly `motivefx_foundations_test`. It resets that disposable schema. Do not point it at an existing/customer database. The hosted `Actual PostgreSQL transactional acceptance` workflow supplies its own PostgreSQL 17 service and fixture-only credentials. No production secrets are required.

The first complete PostgreSQL 17.6 run found three defects:

1. Prisma's empty-update `upsert` could throw a duplicate-key error when two workers first enqueued the same event. Enqueue now uses a single insert with conflict suppression; the original payload is immutable.
2. Per-user locks did not serialize two different accounts racing for a new push token. Registration now also takes a transaction-scoped lock for the token identity. The second account sees the committed owner and receives `ownership_conflict`; the token is never transferred.
3. The notification migration omitted `ON UPDATE CASCADE` on three user foreign keys, while the Prisma relation contract specified it. A separate staged correction aligns those actions and preserves existing delete cascades. No historical migration was rewritten.

## Evidence

All 23 actual PostgreSQL scenarios passed locally after the fixes, with zero skips. They cover:

- RLS enabled on all six new tables; no client policies; an explicitly granted client role still cannot read rows or insert receipts.
- Actual migration FK actions and account-deletion cascades.
- Immutable concurrent enqueue, single delivery-claim winner, stale-attempt rejection, abandoned-claim quarantine and disabled gates.
- Revocation and lost entitlement preventing dispatch; signed receipt deduplication, rollback/retry and irreversible suppression after late delivery receipts.
- Synthetic Expo receipt revocation of stored devices and suppression of their queued jobs.
- Concurrent verification requests and single-use consumption, resend invalidation, separate Daily consent and old-link opt-out ordering.
- Same-owner device retries and competing-account token ownership.
- Concurrent Stripe receipt/entitlement reconciliation, database-triggered audit rollback with successful retry, and protection against old-subscription reactivation after cancellation.
- Durable one-time checkout setup claims after an ambiguous synthetic send.
- Concurrent Ops status/audit transitions, actual audit rejection rollback, missing incidents and durable reopening.
- Idempotent workspace creation, denied-role persistence checks and a real row-lock race where a concurrent downgrade prevents the pending research write.

The separate 88 focused notification/onboarding/workspace regressions and site TypeScript checks also pass. CI runs the isolated PostgreSQL suite on relevant changes; its exact run/commit evidence belongs in the release ledger.

## Staged activation order

Apply and accept these only in an explicitly authorized environment:

1. `20261116011500_notification_delivery_foundations`
2. `20261116020000_email_verification_foundations`
3. `20261116181000_notification_fk_update_contract`

The production schema and all delivery, verification, registration and native purchase flags remain unchanged by this release. Local/CI fixture flags do not activate a deployed service.

## Remaining acceptance

Provider operations are synthetic and cannot reach the external network in these fixtures. Actual inbox/device receipt, sender/domain/postal setup, Expo/store configuration, sandbox billing lifecycle and installed-device behavior remain unverified. The fixture's database roles are controlled local roles; production role configuration and production migration acceptance remain separate. No actual invitation, email, push, charge, customer mutation or incident acknowledgment was performed. These checks do not establish customer/browser acceptance or calibrated forecasting.
