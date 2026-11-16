# Email verification and notification preferences

Address proof, account access, and permission to receive email are separate.
Verifying an address does not opt it into Motive Daily. Paying does not provide
notification consent. Existing signup/login access is preserved; this release
adds the confirmation lifecycle without imposing a new verification wall on
existing customers.

## Implemented path

Account settings displays address verification and notification preferences. An
authenticated customer can explicitly request account verification or Motive Daily
confirmation. Neither operation is automatic during registration or checkout.

Challenges use 256-bit random opaque tokens and store only a purpose-separated
hash, the current address hash, purpose and expiry. Tokens expire after 30 minutes,
are claimed once atomically, and are invalid after an address change, account
disabling, resend or consumption. A locked per-user request path enforces a
one-minute cooldown and five requests per hour across purposes. Tokens and
addresses do not appear in HTTP responses or logs.

The email confirmation GET is a non-mutating form with no-referrer/no-store and a
restrictive CSP. Confirmation requires POST, so link scanners cannot verify an
address or subscribe it. Account verification records only address proof. A daily
confirmation also rechecks the current plan, suppression, and any opt-out newer
than the request before recording confirmed consent. An old link cannot reverse
an unsubscribe, bounce suppression or plan loss.

Customers can revoke daily email, every push device, or one registered device.
Queued/retry deliveries are suppressed immediately. Provider-accepted or already
in-flight delivery cannot be recalled. Device registration requires authenticated
ownership, explicit granted permission and current entitlement. It is idempotent,
capped at ten devices and refuses transfer of another account's token. iOS is
excluded while the app remains a free informational reader.

## Inactive boundaries

All new verification tables and the preceding notification tables are staged
migrations, not applied by this change. The verified-address model adds only User
relations, avoiding new scalar-column reads on existing production account flows.

`MOTIVE_EMAIL_VERIFICATION_ENABLED=true` requires notification storage before new
verification tables are read. Preparation/sending also requires the existing
notification sending gate. `MOTIVE_PUSH_REGISTRATION_ENABLED=true` separately gates
device registration. All are absent/off in the deployment inspected during this
work. No email, push, schedule, consent backfill, credential change or native
purchase is activated.

Disposable PostgreSQL acceptance now verifies the notification and verification
migrations plus the FK-contract correction, RLS, account deletion cascades and
transaction behavior (see `TRANSACTIONAL_POSTGRES_ACCEPTANCE.md`). Production
schema/role acceptance is still required. Then use controlled
addresses/devices to verify confirmation, spam/rate handling, resend, opt-out,
revocation and exact provider receipts before real activation. Provider responses remain synthetic; neither isolated PostgreSQL acceptance
nor the original doubled tests prove inbox or device delivery.
Production activation remains outside this no-send/no-data-write package.

The backend refuses tokens already owned by another account. Shared-device account
switching requires device-specific acceptance and safe revocation/rotation before
push is enabled. Do not silently transfer a token to work around that boundary.

## Routes

| Route | Purpose |
|---|---|
| `POST /api/auth/email-verification` | Authenticated explicit request, bounded and rate-limited |
| `GET/POST /api/auth/email-verification/confirm` | Non-mutating preview / single-use confirmation |
| `GET/POST /api/notifications/preferences` | Own preferences / opt-out only |
| `POST/DELETE /api/notifications/devices` | Own device registration / revocation |

`node --test tests/notification-onboarding.test.mjs` covers concurrency, expiry,
resend, identity changes, separate consent, opt-out ordering, suppression,
entitlement loss, native reader exclusions, ownership and disabled route behavior.
