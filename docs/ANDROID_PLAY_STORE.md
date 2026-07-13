# MotiveFX.AI — Android & Google Play Store

> Phase 1 scaffold complete. Terminal loads in Expo WebView for 1:1 mobile design parity with the web app.

---

## Architecture decision

| Approach | Status | Notes |
|----------|--------|-------|
| **Expo + WebView terminal** | **Active (v0.1)** | Loads `https://motivefx.ai/terminal/` after native auth — matches `MobileBottomNav` design instantly |
| Expo native screens | Legacy stubs | `HomeScreen`, `StocksScreen`, etc. kept for future native parity |
| Capacitor wrapper | Deferred | Web terminal already mobile-optimized; Expo chosen per `MOBILE_STRATEGY.md` |

**LinkedIn:** on hold until Meta/LinkedIn verification completes (marketing only — does not block Android).

---

## What was built

### Mobile app (`mobile/`)

| File | Purpose |
|------|---------|
| `src/screens/TerminalScreen.tsx` | Full-screen WebView + auth token injection into terminal localStorage |
| `src/navigation/RootNavigator.tsx` | Auth stack → Terminal (no duplicate native tabs) |
| `src/config.ts` | `EXPO_PUBLIC_TERMINAL_URL`, API, legal URLs (production defaults) |
| `app.json` | Android package `ai.motivefx.app`, edge-to-edge; custom scheme `motivefx` only (App Links / intentFilters **not** enabled) |
| `eas.json` | `preview` (APK) + `production` (AAB) build profiles |
| `assets/` | Placeholder icons (replace before store) |

### Web terminal (`web/`)

| Change | Purpose |
|--------|---------|
| `index.html` | `viewport-fit=cover`, `theme-color`, PWA meta for phone shells |
| `global.css` | `100dvh`, safe-area padding, `motivefx-native-shell` class hides web-only chrome in app |
| `MobileNav.tsx` | Already implements bottom nav (Home / Trades / Crypto / Bets / More) at ≤900px |

---

## Local development

### 1. Generate placeholder assets (first time)

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai
node scripts/generate-mobile-assets.mjs
```

### 2. Install & generate Android project

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai\mobile
npm install
npx expo prebuild --platform android
```

Requires **Android Studio** + SDK 34+ on your machine for `expo run:android`.

### 3. Point at local terminal (optional)

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3010/api
EXPO_PUBLIC_WEB_URL=http://10.0.2.2:3010
EXPO_PUBLIC_TERMINAL_URL=http://10.0.2.2:3010/terminal/
```

(`10.0.2.2` = host machine from Android emulator.)

### 4. Run on device/emulator

```powershell
npm run android
# or
npx expo start --android
```

---

## EAS cloud build (no local Android Studio)

```powershell
npm install -g eas-cli
cd mobile
eas login
eas build:configure   # creates EAS project ID → update app.json extra.eas.projectId
eas build --platform android --profile preview
```

Install the APK from the EAS dashboard on a physical device for testing.

---

## Play Store submission checklist

### Accounts & assets

- [ ] Google Play Console developer account ($25 one-time)
- [ ] Replace `mobile/assets/*.png` with 1024×1024 brand icon + adaptive foreground
- [ ] Feature graphic 1024×500
- [ ] Phone screenshots (6.7", 6.1", 5.5") showing Home, Trades, Crypto, bottom nav
- [ ] Short + full description emphasizing **information-only**, not trading/betting execution

### App configuration

- [ ] Set real `eas.projectId` in `app.json`
- [ ] Add `google-play-service-account.json` for `eas submit` (never commit — add to `.gitignore`)
- [ ] Bump `versionCode` / `version` for each release
- [ ] Production build: `eas build --platform android --profile production` (AAB)

### Policy & compliance

- [ ] **Data safety form** — email, user ID, portfolio holdings (user-entered), usage analytics
- [ ] **Financial features** declaration in Play Console
- [ ] **Content rating** (IARC) — betting references may increase age rating
- [ ] Privacy policy URL: `https://www.motivefxai.com/privacy`
- [ ] **Account deletion / data deletion URL:** `https://www.motivefxai.com/data-deletion`
- [ ] Terms of Service URL: `https://www.motivefxai.com/terms`
- [ ] In-app disclaimer visible (terminal footer + auth screen)
- [x] **Billing: web only** — subscriptions at `https://www.motivefxai.com/pricing` (no Play Billing in v1). Documented in store listing + auth screen. Do not sell digital goods in-app until IAP is intentionally adopted.
- [ ] Geo-restrict betting module where required
- [ ] Social / website fields — MotiveFX Instagram / Facebook / LinkedIn URLs in `docs/PLAY_STORE_LISTING.md` (defaults in `apps/site/src/lib/social.ts`; optional `SOCIAL_*` env overrides). Do not use MotiveLife profiles.

**Store listing copy + social URLs:** `docs/PLAY_STORE_LISTING.md`

### Post-review launch checklist

- [ ] Production AAB live on Play Console
- [ ] Smoke-test login → terminal WebView on a physical device
- [ ] Confirm subscribe CTA opens **external browser** to `/pricing` (web billing)
- [ ] Confirm `/demo` and `/terminal/?demo=1` still work ungated for marketing
- [ ] Monitor Stripe webhooks + cancel via Customer Portal
- [ ] Only then consider Phase 4 Play Billing / RevenueCat if conversion requires it

### Testing before submit

- [ ] Register → login → terminal loads with bottom nav
- [ ] Auth tokens persist across app restart
- [ ] All 5 modules reachable via bottom nav + More sheet
- [ ] Virtualized activity tables scroll smoothly on mid-range Android
- [ ] Stripe checkout opens in browser (not in WebView) for subscriptions
- [ ] 2FA flow works end-to-end

---

## Next phases

| Phase | Work |
|-------|------|
| **2** | Push notifications (Expo Notifications + server alerts) |
| **3** | Native screens for feed/portfolio (FlashList) — reduce WebView dependency |
| **4** | Play Billing via RevenueCat (optional, if mobile conversion justifies 15–30% fee) |
| **5** | Biometric unlock, offline watchlist cache |

---

## Design reference (from prior review)

The approved mobile design is the **web terminal at phone widths**:

- Dark `#080a0c` shell, module accent colors per tab
- Fixed **bottom navigation**: Home · Trades · Crypto · Bets · More
- **More sheet** for Pink Slips + Predictions + workspace settings
- Dense virtualized scoop tables (`VirtualizedTable` / `VirtualizedScoopList`)
- Home command center with MotiveFX Score + opportunity cards

Interactive HTML mockup: `docs/MOTIVEFX-LAUNCH-REVIEW.html`

---

## Android App Links (Digital Asset Links)

Hosted statement (site `apps/site` on Vercel):

- **URL:** `https://www.motivefxai.com/.well-known/assetlinks.json`
- **Source:** `apps/site/public/.well-known/assetlinks.json`
- **Package:** `ai.motivefx.app`

**Verify with Google** after deploy:

[Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator) — enter `www.motivefxai.com`, package `ai.motivefx.app`, and the SHA-256 fingerprint from Play Console.

**Fingerprint check:** the SHA-256 in `assetlinks.json` must match **Play Console → App integrity → App signing key certificate** (Play App Signing). If verification fails, compare against the **upload key certificate** only if that is what you intentionally used.

### App Links status in the mobile app

**Hosting only for now.** `mobile/app.json` has custom scheme `motivefx` but **no** `android.intentFilters` with `autoVerify` and **no** iOS `associatedDomains`. Do not re-enable verified App Links until deep-link handling is confirmed stable (they were removed earlier for crash fixes).

To re-enable later (do **not** ship until tested on a physical device):

1. Confirm `assetlinks.json` verifies in Google’s tester with the Play signing fingerprint.
2. In `mobile/app.json` under `android`, add intent filters for `https://www.motivefxai.com` (and paths you own), with `"autoVerify": true`.
3. Rebuild with EAS; confirm no startup crash and that links open the app as expected.
4. iOS: only add `associatedDomains` + `apple-app-site-association` if you have a real Apple Team ID — do not invent one.

---

*Last updated: July 13, 2026*
