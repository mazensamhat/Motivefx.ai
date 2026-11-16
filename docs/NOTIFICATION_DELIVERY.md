# MotiveFX notification delivery foundations

This package supplies the backend for Motive Daily email and closed-app Expo
push. It is **inactive by default**. It does not install a schedule, send mail or
push, change customer consent, register devices, or apply a production migration.

## What is implemented

- An additive durable outbox, per-user consent records, device records, and receipt
  deduplication. New tables have RLS enabled without anonymous/client policies.
- Motive Daily preparation reuses the customer's existing entitlement-scoped home
  briefing. Degraded, absent, or stale briefing content is not emailed. Pagination
  is explicit; the caller must advance `nextCursor` until null.
- Durable in-app alerts can enqueue one push per alert ID and registered device.
  Existing in-app alerts remain saved if outbound enqueue fails. No historical
  alerts predating consent or the delivery window are queued for push.
- The worker rechecks the current account, plan entitlement, confirmed address,
  consent, suppression and device identity immediately before dispatch.
- Claims use database compare-and-set and deterministic event/recipient keys.
  Retried jobs retain their frozen payload. Email retries use the same Resend
  idempotency key, stop after four attempts, and expire within 20 hours. Abandoned
  claims and ambiguous push acceptance become `unknown`; they are not blindly
  resent.
- Signed unsubscribe links support a non-mutating confirmation GET and one-click
  POST. Opt-out suppresses queued/retry deliveries. Already accepted or in-flight
  provider requests cannot be recalled.
- Resend receipts use the official Svix verifier on the raw request body, reject
  stale/tampered signatures, and deduplicate receipt IDs. Bounce/complaint events
  suppress future mail. The `motive_notification` tag isolates this traffic from
  other products and transactional messages on the shared Resend account.
- Expo ticket acceptance and provider receipts are separate states. Stale device
  receipts revoke that endpoint. A provider receipt does not prove device display
  or inbox placement. No receipt path reports a message as read.

## Activation prerequisites

The following are real remaining work, not evidence that delivery is already live:

1. Apply the reviewed additive migration in an appropriate environment and verify
   the role/RLS behavior. This implementation checkpoint does not apply it.
2. Complete the authenticated opt-in/address-confirmation flow and device
   permission/registration lifecycle. Never populate consent or confirmed address
   records merely because a user pays or has an account. Recheck native reader/IAP
   policy before activating paid push on a store build.
3. Configure a valid postal address, verified sender, unsubscribe origin, the
   existing Resend account's webhook secret, and any required Expo push credentials.
   No credentials are created or rotated by this package.
4. Verify controlled real delivery and its receipts, opt-out, duplicate event,
   retry, revoked device, and bounced address cases before activation. The tests
   here use provider doubles and do not send messages.
5. Only then activate storage and sending and configure the scheduler. The two
   new cron routes are intentionally absent from `vercel.json` until this gate.

Feature gates: `MOTIVE_NOTIFICATION_STORAGE_ENABLED=true` enables new-table use;
`MOTIVE_NOTIFICATION_SEND_ENABLED=true` additionally enables dispatch. With either
gate absent, both cron routes return a disabled state before touching delivery
storage or providers. Do not set them as part of an unrelated release.

Configuration names: `MOTIVE_NOTIFICATION_POSTAL_ADDRESS`,
`MOTIVE_NOTIFICATION_WEBHOOK_SECRET`, optional `MOTIVE_EXPO_ACCESS_TOKEN`, and the
existing email sender/Resend/auth configuration. Keep values out of logs and PRs.

## Routes

| Route | Behavior |
|---|---|
| `GET /api/admin/notifications` | Authenticated read-only activation/state counts; unavailable stays unknown |
| `GET /api/cron/motive-daily` | Cron-authenticated, bounded/idempotent daily preparation; cursor required for subsequent pages |
| `GET /api/cron/notifications` | Cron-authenticated dispatch and Expo receipt polling |
| `GET/POST /api/notifications/unsubscribe` | Signed confirmation/opt-out; GET never changes consent |
| `POST /api/webhooks/notification-email` | Signed, tagged, deduplicated receipt and suppression handling |

## Verification

```sh
node --experimental-strip-types --test \
  apps/site/scripts/notification-delivery.test.mjs \
  apps/site/scripts/notification-routes.test.mjs
pnpm --filter @motivefx/site exec tsc --noEmit
```

Tests cover entitlement/consent changes after enqueue, identity changes, competing
dispatchers, immutable retry keys and payloads, bounded windows, unknown push
acceptance, escaped email content, real Svix verification, shared-account traffic
isolation, receipt order, opt-out GET safety, disabled routes and authorization.

Provider contracts: [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Resend verification](https://resend.com/docs/webhooks/verify-webhooks-requests),
[Resend events](https://resend.com/docs/webhooks/event-types),
and [Expo tickets and receipts](https://docs.expo.dev/push-notifications/sending-notifications/).
