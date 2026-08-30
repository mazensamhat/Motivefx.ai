# MotiveFX.AI — Mobile Strategy (iOS & Android)

> Decision document for store submission, billing, and feature parity.

---

## Current state

| Item | Status |
|------|--------|
| Framework | Expo SDK 56 + React Native 0.85 |
| Bundle ID | `ai.motivefx.app` |
| Android scaffold | `expo prebuild` + `eas.json` (see `docs/ANDROID_PLAY_STORE.md`) |
| Primary UI | **Terminal WebView** — loads `/terminal` (no trailing slash) for mobile design parity |
| Legacy screens | Feed, Stocks, Crypto, Betting (native stubs, not in main nav) |
| Auth | Login/register + secure token storage → native-handoff cookie + localStorage injection |
| Billing (Android / Play) | **No web checkout steering.** Purchase CTAs stay off until Play Billing (RevenueCat Android key + products) is verified. Website `/pricing` remains for browser users only. |
| Billing (iOS) | Same rule: StoreKit/RevenueCat when configured; never Safari/web pricing from the app shell |
| Age assurance | **18+ gate** on first launch + module gates for betting/predictions |
| API | `EXPO_PUBLIC_API_URL` env (defaults to production www host) |

See **`docs/PLAY_SUSPENSION_APPEAL.md`** for Play Enforcement appeal text and operator checklist.  
See **`docs/APP_STORE_REVIEW_RESPONSE.md`** for App Review reply text and Connect checklist.

---

## Recommended approach: **Store billing in-app; web Stripe outside the app**

### Phase 1 — Play / store remediation (current)

**Strategy:** Native shell for consumption; **digital subscriptions must not be sold via website links from the app.**

| Why | Detail |
|-----|--------|
| Google Play Payments | Digital goods sold or steered from the Android app must use Play Billing |
| Apple 3.1.1 | Same for iOS — StoreKit inside the app; Stripe only on the website for browser users |
| Current interim | Keep purchase CTAs off in MotiveFXNative when RevenueCat keys are unset; signed-in entitlements still work |

**App features now:**
- Login / register (same auth API as web) + native **Delete account**
- Full terminal in WebView after `GET /api/auth/native-handoff`
- Auth session via httpOnly cookie handoff + localStorage injection
- **Do not** deep-link to `/pricing` for digital subscriptions from the Android/iOS shell
- In-app disclaimers + Privacy / Terms / data-deletion URLs

**Store listing copy (Play):**
> Digital subscriptions, when offered in the app, are sold through Google Play Billing. The website may sell plans to browser users; the Android app does not steer purchases to the website.

### Phase 2 — Parity (post-revenue)

- Full portfolio CRUD on mobile
- Push notifications (price alerts, renewal reminders)
- Biometric unlock (Face ID / fingerprint)
- Offline cache for watchlists

### Phase 3 — Native billing live

When mobile conversion justifies platform fees:

- RevenueCat → StoreKit + Play Billing configured in EAS
- Map product IDs to intelligence tiers
- Server webhook syncs entitlements
- Keep web Stripe for **browser** customers only (never opened from MotiveFXNative)

---

## iOS App Store requirements

| Requirement | Action |
|-------------|--------|
| Apple Developer Program ($99/yr) | Enroll as organization or individual |
| Privacy Policy URL | `https://www.motivefxai.com/privacy` |
| App Privacy Details | Declare: email, user ID, usage data, financial info (user-entered portfolios) |
| Sign in with Apple | Required if Google/social login added on iOS |
| Guideline 3.1.1 (IAP) | Digital subscriptions inside the app use StoreKit when configured; **do not** link out to web pricing from the iOS shell |
| Guideline 3.1.3(f) | Reader apps exception does **not** apply — this is SaaS tools |
| Financial content | Prominent disclaimer; no guaranteed returns |
| Betting content | Geo-restrict modules; 17+ or 18+ rating; regional compliance |

**Post-review launch checklist (iOS):** App Store listing live ([MotiveFX.AI](https://apps.apple.com/ca/app/motivefx-ai/id6789334125)) → smoke-test auth + WebView terminal → confirm no Safari/web pricing CTAs in the shell → only enable StoreKit / RevenueCat when products + keys are verified. Website discovery: Smart App Banner + `/download` + schema.org SoftwareApplication (iOS + Android).

### Build & submit

```bash
cd mobile
npm install
eas build --platform ios   # requires EAS account
eas submit --platform ios
```

Configure `app.json` / `eas.json`:
- `ios.bundleIdentifier`: `ai.motivefx.app`
- `ios.infoPlist.NSFaceIDUsageDescription` (when adding biometrics)
- Associated domains for universal links (optional)

---

## Google Play requirements

| Requirement | Action |
|-------------|--------|
| Play Console ($25 one-time) | Create developer account |
| Target API level | Meet current Play policy (API 34+) — Expo 56 handles this |
| Data safety form | Match iOS privacy declarations |
| Financial features declaration | Required in Play Console |
| Play Billing | Required before re-enabling in-app purchase CTAs — see `docs/ANDROID_PLAY_STORE.md` and `docs/PLAY_SUSPENSION_APPEAL.md` |
| Content rating | IARC questionnaire — gambling references may affect rating |

```bash
eas build --platform android
eas submit --platform android
```

---

## API configuration

### Development
```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8001/api
```

### Production
```env
EXPO_PUBLIC_API_URL=https://www.motivefxai.com/api
```

Use `mobile/src/config.ts` — never hardcode production URLs in source.  
(Do **not** use `api.motivefx.ai` — production APIs live on the www site host.)

---

## Auth on mobile

Tokens stored in **expo-secure-store** (Keychain / Keystore):

```
mobile/src/lib/auth.ts   — token read/write
mobile/src/lib/api.ts    — Bearer header on requests
mobile/src/screens/AuthScreen.tsx
mobile/src/context/AuthContext.tsx
```

Flow matches web:
1. Register / login → receive access + refresh tokens
2. Optional 2FA prompt after login
3. Refresh token rotation on 401

---

## Alternative considered: Capacitor web wrapper

| Pros | Cons |
|------|------|
| Fastest path to store | Apple may reject thin WebView shells |
| 100% feature parity with web | Worse native UX (keyboard, gestures) |
| Single codebase | Harder to pass performance review |

**Decision (updated July 2026):** Expo native shell with **Terminal WebView** for Android v1 — instant design parity with the polished web mobile UX (`MobileBottomNav`). Native FlashList screens remain Phase 2+.

---

## Checklist before store submission

- [ ] Production API URL in EAS secrets
- [ ] Privacy + Terms accessible in-app (WebView or in-app browser)
- [ ] Disclaimer on first launch
- [ ] No localhost references in release build
- [ ] TestFlight / internal testing with real auth + subscribed account
- [ ] Confirm Android shell does **not** open `/pricing` or Stripe for digital goods
- [ ] Support URL and marketing URL in store listing
- [ ] Social contact fields: Instagram / Facebook / LinkedIn from `docs/PLAY_STORE_LISTING.md` (also `mobile/src/config.ts` `STORE_SOCIAL_URLS`)
- [ ] Screenshots for 6.7" and 6.1" iPhone + phone/tablet Android

---

*Last updated: August 1, 2026*
