# Native notification and purchase groundwork

This source package does not publish a new native build, request a real device's
permission, send push, enable IAP or make a purchase. Preview/production EAS
profiles explicitly keep both `EXPO_PUBLIC_PUSH_ENABLED` and
`EXPO_PUBLIC_IAP_ENABLED` false. iOS remains a free informational reader.

## Push implementation

The SDK-56-compatible Expo notification dependency is installed. Its native config
plugin is included only in an explicitly enabled build. Android has an explicit
opt-in control that checks server availability before asking OS permission. It
gets an Expo token, registers it with the authenticated backend, handles token
rotation, rechecks permission when the app resumes and opens only the supported
Terminal destination on a notification tap. Refresh never prompts for permission.

A saved registration contains a device ID, account ID and a revoke-only signed
capability; the Expo token is not copied into local persistence. Logout starts
revocation before removing the session. Failed revocation remains queued locally
and can be completed without a valid account session on the next app start.
Rotated endpoints retain their revocation capability until it succeeds. The
capability cannot read preferences, sign in, register or send. Server revocation
checks both the owner and device, so it cannot revoke another owner's record.

Watch push payloads use a generic alert title/body; detailed research stays behind
sign-in. Accepted Expo tickets/receipts still do not establish device display.

The backend deliberately refuses a token owned by another account, even if it was
revoked. Shared-device account switching needs controlled device/token-rotation
acceptance before activation. Do not silently transfer an endpoint to avoid this
check. While offline, a revocation cannot recall a previously accepted provider
message. Complete the logout/offline/reconnect cases on a real build first.

## Purchase correctness repairs

- A public RevenueCat key does not activate purchases without the explicit flag.
- A requested tier must match the exact store product ID. Generic monthly/annual
  packages cannot charge a different product when that tier is unavailable.
- Configure/login, purchase, restore and logout are serialized. They bind to the
  native authenticated account, not an account ID from a WebView message. Failed
  or ambiguous identity changes fail closed until a fresh launch; the SDK's
  actual account identity is checked immediately before a purchase/restore.
- A successful store request requires that requested product's entitlement. An
  existing unrelated entitlement does not establish that the new purchase worked.
- Dates and app-user IDs are never manufactured into transaction IDs.
- The server remains the entitlement authority. Native purchase/restore reports
  pending until the authenticated server acknowledgment confirms the requested
  tier; Stripe access is not mistaken for an Apple/RevenueCat entitlement.

## Remaining acceptance and prerequisites

| Area | Required evidence before activation |
|---|---|
| Push build | Authorized FCM/APNs credentials, compatible development/release build and correct project ownership |
| Closed app | Permission granted/denied/revoked, background/killed app, tap routing, token rotation, duplicate handling and actual Expo receipt |
| Account lifecycle | Offline logout/reconnect, account switching, locally unavailable storage, backend unavailability and account deletion |
| Native purchases | Verified store products/offerings and entitlement mapping; controlled sandbox buy/restore/cancel/renew and server webhook reconciliation |
| Distribution | Approved iOS/Android release and physical-device acceptance; no EAS build/store submission was run here |

Biometrics and offline watchlists remain Phase 2 deferred. Source tests and mobile
TypeScript verify policy and wiring; they are not a substitute for a native build
or store/device acceptance.

Tests: `node --test tests/native-delivery-billing.test.mjs`; `npm --prefix mobile run typecheck`.
SDK contract: [Expo SDK 56 notifications](https://docs.expo.dev/versions/v56.0.0/sdk/notifications/).
