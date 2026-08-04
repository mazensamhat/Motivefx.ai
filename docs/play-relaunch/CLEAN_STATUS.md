# Play relaunch clean status

**Date:** 2026-08-04  
**Target listing:** MotiveFX · `com.motivefx.app` · 1.0.0 / versionCode 1  
**Dead listing (do not reuse):** MotiveFX.AI · `ai.motivefx.app`

## Verdict

**Clean enough to build an AAB** for a **new** Play app, provided:

1. The developer account can still publish a new app, and  
2. You complete physical-device smoke + Console forms before review submit.

No code blockers found that would force keeping the old package or claiming live IAP.

## Audited and OK

| Area | Result |
|------|--------|
| `mobile/app.json` name / package / version / versionCode | MotiveFX · `com.motivefx.app` · 1.0.0 · 1 |
| Android permissions | `INTERNET`, `VIBRATE` only |
| Soft auth timeouts | `fetchWithTimeout` uses Promise.race; no auth `AbortController.abort()` |
| Payments URL block | Native WebView + `nativeShell` block Stripe / `/pricing` / checkout |
| Subscribe CTAs on native | No web pricing fallback; ModuleGate / TierPricing non-steering without IAP |
| Account deletion | Native Delete account screen + Account modal + `POST /api/auth/delete-account` |
| Public deletion URL | `https://www.motivefxai.com/data-deletion` |
| Privacy / Terms | `https://www.motivefxai.com/privacy` · `/terms` |
| Android Play-safe desks | `isNativeAndroidShell()` hides bet/prediction ledgers; blocks sportsbook/prediction handoffs |
| Forced `demo=1` landmine | Terminal prefers cookie handoff; docs warn against trailing slash issues |
| User-facing native brand | Auth / age gate title **MotiveFX** |

## Fixed in this pass

| Fix | Why |
|-----|-----|
| `eas.json` `EXPO_PUBLIC_IAP_ENABLED` → `false` | Must not claim / enable store purchase CTAs until Play Billing is verified |
| Auth disclaimer + build tag → 1.0.0 / `com.motivefx.app` | Stale 1.0.4 tag + wording that over-claimed Play Billing |
| Web `AgeGateModal` / `AppAgeGate` → MotiveFX | Avoid MotiveFX.AI branding clash with new listing name |
| `assetlinks.json` package → `com.motivefx.app` | Old package must not stay as the active App Links target |
| Data deletion copy (site + web) | Say MotiveFX app, not MotiveFX.AI Android |
| Screenshot note package string | Remove `ai.motivefx.app` from store mock HTML |
| `app.json` `blockedPermissions` | Strip Expo default storage / SYSTEM_ALERT_WINDOW from the AAB |
| Master docs + `CHECKLIST.txt` | Single path from now → submit |
| `npm run build:android:production` | Exact EAS production command documented in package.json |

## Note on local `mobile/android/`

The local native folder is **gitignored**. A stale prebuild may still show `ai.motivefx.app` / MotiveFX.AI on disk. **EAS cloud builds regenerate from `app.json`.** Before any local `expo run:android`, run:

```bash
cd mobile
npx expo prebuild --platform android --clean
```

Confirm `applicationId` is `com.motivefx.app` and `app_name` is MotiveFX.

## Remaining human / Console work (not code)

- [ ] Confirm Play account Policy status allows a **new** app
- [ ] Physical Android smoke test
- [ ] Store screenshots (Play-safe; no placement UI)
- [ ] Create new app in Play Console; upload AAB
- [ ] Data Safety, content rating, financial features, distribution
- [x] Upload-key SHA-256 updated in `apps/site/public/.well-known/assetlinks.json` from production AAB `56060db5-5324-4563-8226-d23fbc2faceb` (EAS-generated upload keystore, 2026-08-04): `92:4F:49:04:E0:74:E0:88:C0:E0:B9:5E:EC:28:44:A2:6F:88:13:38:02:A3:6F:82:76:68:D5:8F:0C:F7:98:91` — **redeploy site** so `/.well-known/assetlinks.json` is live
- [ ] After first Play upload: if Play App Signing is enabled, also add the **App signing key certificate** SHA-256 from Play Console → Setup → App signing (assetlinks can list both upload + app-signing fingerprints)
- [ ] Keep iOS `bundleIdentifier` `ai.motivefx.app` as-is for Apple until a separate iOS rename is planned (Android only uses `com.motivefx.app`)

## Explicit non-claims

- Play Billing is **not** live in this Android build.
- Old listing reinstatement is **not** the path; appeal denial stands for `ai.motivefx.app`.
