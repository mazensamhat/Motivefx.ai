# MotiveFX — Android & Google Play Store

> Expo WebView terminal for 1:1 mobile parity with the web app.  
> **Relaunch path:** new listing **MotiveFX** / package **`com.motivefx.app`** — see [`PLAY_RELAUNCH_NEW_LISTING.md`](./PLAY_RELAUNCH_NEW_LISTING.md).

---

## Enforcement note (2026-08)

The prior listing **MotiveFX.AI** (`ai.motivefx.app`) was suspended; appeal denied. Treat that package as dead.

- Do **not** upload new binaries to the suspended app.
- Relaunch only with package **`com.motivefx.app`**, display name **MotiveFX**, version **1.0.0** / versionCode **1**.
- Plain steps: [`play-relaunch/CHECKLIST.txt`](./play-relaunch/CHECKLIST.txt)

**Plain assessment:** Without Google Play Billing fully configured, the Android app must **not** offer purchase CTAs that open the website. Current builds keep `EXPO_PUBLIC_IAP_ENABLED=false` and block web checkout URLs.

---

## Architecture

| Approach | Status | Notes |
|----------|--------|-------|
| **Expo + WebView terminal** | **Active** | Loads `https://www.motivefxai.com/terminal` after native auth |
| Expo native screens | Legacy stubs | Kept for future native parity |

**Play risk:** Thin WebView wrappers can fail Minimum Functionality. Mitigations: native age gate, native auth, native account deletion, error/retry shell, deferred billing SDK, Android Play-safe desk mode.

---

## Mobile identity (`mobile/app.json`)

| Field | Value |
|-------|--------|
| `expo.name` | MotiveFX |
| `expo.android.package` | `com.motivefx.app` |
| `expo.version` | 1.0.0 |
| `expo.android.versionCode` | 1 |
| `expo.scheme` | `motivefx` |
| `expo.ios.bundleIdentifier` | `ai.motivefx.app` (iOS unchanged for now) |
| Permissions | `INTERNET`, `VIBRATE` |

---

## Play-safe Android behavior

- Betting / predictions desks: **monitor-only** odds/event intel; no sportsbook or prediction-market app handoffs; bet/position ledgers hidden on Android native.
- Payments: never open Stripe / `/pricing` / web subscription management for digital goods from the native shell.
- IAP: disabled via `EXPO_PUBLIC_IAP_ENABLED=false` until Play Billing is verified.
- Auth: soft timeouts (no abort-on-timeout that surfaces as “canceled”).
- Account deletion: in-app + `https://www.motivefxai.com/data-deletion` + `POST /api/auth/delete-account`.

---

## EAS

```bash
cd mobile
eas build --platform android --profile production   # AAB
eas build --platform android --profile preview       # APK smoke
```

---

## Android App Links

Hosted statement: `https://www.motivefxai.com/.well-known/assetlinks.json`  
Package: **`com.motivefx.app`**  
Verify SHA-256 against the upload / app-signing cert after the first EAS build. Custom scheme `motivefx` remains available without App Links.

---

## Disclosure URLs

- Privacy: `https://www.motivefxai.com/privacy`
- Terms: `https://www.motivefxai.com/terms`
- Data deletion: `https://www.motivefxai.com/data-deletion`

---

*Last updated: August 4, 2026*
