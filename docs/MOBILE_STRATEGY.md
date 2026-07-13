# MotiveFX.AI — Mobile Strategy (iOS & Android)

> Decision document for store submission, billing, and feature parity.

---

## Current state

| Item | Status |
|------|--------|
| Framework | Expo SDK 56 + React Native 0.85 |
| Bundle ID | `ai.motivefx.app` |
| Android scaffold | `expo prebuild` + `eas.json` (see `docs/ANDROID_PLAY_STORE.md`) |
| Primary UI | **Terminal WebView** — loads `/terminal/` for full mobile design parity |
| Legacy screens | Feed, Stocks, Crypto, Betting (native stubs, not in main nav) |
| Auth | Login/register + secure token storage → injected into WebView |
| Billing | **Not in app** — subscribe on web |
| API | `EXPO_PUBLIC_API_URL` env (defaults to production) |

---

## Recommended approach: **Phased native + web billing**

### Phase 1 — Launch (now → store v1.0)

**Strategy:** Native shell for consumption; **subscriptions only on web**.

| Why | Detail |
|-----|--------|
| Apple/Google IAP rules | Digital subscriptions sold *inside* the app must use StoreKit / Play Billing (15–30% fee) |
| Avoid rejection | Stripe Checkout inside a WebView for new subscriptions often fails App Review |
| Industry pattern | Bloomberg, many SaaS apps: "Manage subscription at motivefx.ai" |

**App v1.0 features:**
- Login / register (same auth API as web)
- **Full terminal in WebView** — bottom nav, Home command center, virtualized feeds (matches web mobile)
- Auth session injected into terminal localStorage
- Link out to web for subscribe: `https://motivefx.ai/pricing`
- In-app disclaimers + link to Privacy/Terms

**Store listing copy:**
> Subscriptions are purchased at motivefx.ai. Sign in with the same account to access modules on mobile.

### Phase 2 — Parity (post-revenue)

- Full portfolio CRUD on mobile
- Push notifications (price alerts, renewal reminders)
- Biometric unlock (Face ID / fingerprint)
- Offline cache for watchlists

### Phase 3 — Native billing (optional)

If mobile conversion justifies 15–30% platform fee:

- Integrate **RevenueCat** → StoreKit + Play Billing
- Map App Store / Play product IDs to module tiers
- Server webhook syncs entitlements to `module_subscriptions`
- Keep web Stripe for users who prefer it (account-level entitlement either way)

---

## iOS App Store requirements

| Requirement | Action |
|-------------|--------|
| Apple Developer Program ($99/yr) | Enroll as organization or individual |
| Privacy Policy URL | `https://www.motivefxai.com/privacy` |
| App Privacy Details | Declare: email, user ID, usage data, financial info (user-entered portfolios) |
| Sign in with Apple | Required if Google/social login added on iOS |
| Guideline 3.1.1 (IAP) | **Billing on web only for v1** — do not sell digital subscriptions in-app; link to `https://www.motivefxai.com/pricing` |
| Guideline 3.1.3(f) | Reader apps exception does **not** apply — this is SaaS tools |
| Financial content | Prominent disclaimer; no guaranteed returns |
| Betting content | Geo-restrict modules; 17+ or 18+ rating; regional compliance |

**Post-review launch checklist (iOS):** App Store listing live → smoke-test auth + WebView terminal → confirm subscribe opens Safari to web pricing → only then consider StoreKit / RevenueCat if needed.

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
| Play Billing | Same as iOS — web subscribe for v1 |
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
EXPO_PUBLIC_API_URL=https://api.motivefx.ai/api
```

Use `mobile/src/config.ts` — never hardcode production URLs in source.

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
- [ ] Support URL and marketing URL in store listing
- [ ] Screenshots for 6.7" and 6.1" iPhone + phone/tablet Android

---

*Last updated: June 26, 2026*
