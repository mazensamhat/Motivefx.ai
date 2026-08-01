# MotiveFX.AI — Android & Google Play Store

> Phase 1 scaffold complete. Terminal loads in Expo WebView for 1:1 mobile design parity with the web app.

---

## Enforcement / suspension (2026-08)

Play suspended the app under **Enforcement Process** (repeated non-compliance). Do **not** appeal until:

1. Binary **1.0.5** / versionCode **21** is built and uploaded
2. Site deploy includes `POST /api/auth/delete-account`  
3. Terminal web bundle is rebuilt so native-shell subscribe CTAs no longer open web pricing  
4. Appeal draft in `docs/PLAY_SUSPENSION_APPEAL.md` is reviewed and only claims shipped fixes  

**Plain assessment:** Without Google Play Billing fully configured, the Android app must **not** offer purchase CTAs that open the website. Current remediation removes steering. Re-enabling paid unlock CTAs without Play Billing will likely cause another Payments rejection.

---

## Play rejection notes (Broken Functionality)

### Sign-in "Fetch request has been canceled" (2026-07)

Play reviewers saw Sign in fail with a red **fetch failed / canceled** error, which reads as an unresponsive button.

**Cause:** `AbortController.abort()` on fetch timeout surfaces in React Native/Expo as *"Fetch request has been canceled"* instead of a clear timeout.

**Fix (app 1.0.3 / versionCode 16–17):**
- Soft timeouts via `Promise.race` (no abort signal on auth/API fetch)
- Map cancel/network failures to actionable copy
- One automatic retry on transient auth network errors
- Larger Sign in hit target + disabled styling while loading

### Payments steering removal (2026-08)

**Fix included in app 1.0.5 / versionCode 21:**
- Auth disclaimer no longer points to web `/pricing` or “Safari”
- Terminal shell blocks Stripe/pricing/checkout URLs (does not open external checkout)
- Native IAP fallback no longer opens the website
- Web terminal native-shell paths remove “Manage subscription on website” CTAs
- Native Delete account entry points + `POST /api/auth/delete-account`

The superseded production remediation build **1.0.4** / versionCode **20** finished on EAS at commit `8bc91a8`. The appeal target is **1.0.5** / versionCode **21** so it includes the later main-branch fixes for theme related watches, related-watch scorecard handoff, daily brief greeting/audio alignment, and the ops-console loading path.

Production appeal build **1.0.5** / versionCode **21** finished on EAS:
- Build page: `https://expo.dev/accounts/msamhat/projects/motivefx/builds/8a1bf80a-6a04-47ad-bb72-071e1f8fec9e`
- AAB artifact: `https://expo.dev/artifacts/eas/IzZhQ3oAmUX9AxjeWDeVb5Vbop_a0ew5_fjzqTVOE3Y.aab`

Rebuild AAB: `cd mobile && eas build --platform android --profile production`

---

## Architecture decision

| Approach | Status | Notes |
|----------|--------|-------|
| **Expo + WebView terminal** | **Active** | Loads `https://www.motivefxai.com/terminal/` after native auth — matches `MobileBottomNav` design |
| Expo native screens | Legacy stubs | `HomeScreen`, `StocksScreen`, etc. kept for future native parity |
| Capacitor wrapper | Deferred | Web terminal already mobile-optimized; Expo chosen per `MOBILE_STRATEGY.md` |

**Play risk:** A thin WebView wrapper can fail **Minimum Functionality**. Mitigations today: native age gate, native auth, native account deletion chrome, error/retry shell, deferred billing SDK. Longer-term: Phase 3 native feed screens.

---

## What was built

### Mobile app (`mobile/`)

| File | Purpose |
|------|---------|
| `src/screens/TerminalScreen.tsx` | Full-screen WebView + auth token injection + payments URL block |
| `src/screens/DeleteAccountScreen.tsx` | In-app account deletion (Play requirement) |
| `src/navigation/RootNavigator.tsx` | Age gate → Auth / Delete / Terminal |
| `src/config.ts` | `EXPO_PUBLIC_TERMINAL_URL`, API, legal URLs |
| `app.json` | Android package `ai.motivefx.app` |
| `eas.json` | `preview` (APK) + `production` (AAB) |

### Web terminal (`web/`)

Native shell must **not** call `openExternalSubscribe()` / open `/pricing` for digital goods. Store billing only when `__MOTIVEFX_NATIVE_IAP__` is true.

---

## Play Store submission checklist

### Policy & compliance

- [ ] **Data safety form** — email, user ID, usage; no undeclared sensitive scopes
- [ ] **Financial features** declaration in Play Console
- [ ] **Content rating** (IARC) — betting references may increase age rating
- [ ] Privacy policy URL: `https://www.motivefxai.com/privacy`
- [ ] **Account deletion / data deletion URL:** `https://www.motivefxai.com/data-deletion`
- [ ] Terms of Service URL: `https://www.motivefxai.com/terms`
- [ ] In-app disclaimer visible (terminal footer + auth screen)
- [x] **No web checkout steering for digital subscriptions** (1.0.4+)
- [ ] **Play Billing** configured before re-enabling in-app purchase CTAs (`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` + Play products)
- [ ] Reviewer demo credentials in Console review notes (no 2FA)

### Billing policy (current)

Digital subscriptions **must not** be sold via website links from the Android app. Options:

1. **Preferred:** Google Play Billing (RevenueCat Android) + verified purchase → entitlement sync  
2. **Interim:** No purchase CTAs in the native shell; signed-in users can access plans already on the account; website remains the place to buy **outside** the app (not linked from the app)

---

## Local development / EAS

See prior sections in git history for `expo prebuild` and `eas build` commands. Production profile builds an AAB.

---

## Android App Links (Digital Asset Links)

Hosted statement: `https://www.motivefxai.com/.well-known/assetlinks.json`  
Package: `ai.motivefx.app`  
`mobile/app.json` currently has custom scheme `motivefx` only (no verified App Links).

---

*Last updated: August 1, 2026*
