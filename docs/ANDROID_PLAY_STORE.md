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
| `app.json` | Android package `ai.motivefx.app`, edge-to-edge, deep link to `/terminal` |
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
- [ ] Privacy policy URL: `https://motivefx.ai/privacy`
- [ ] In-app disclaimer visible (terminal footer + auth screen)
- [ ] **Billing:** v1 sells subscriptions on web only (`motivefx.ai/pricing`) — document in store listing
- [ ] Geo-restrict betting module where required

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

*Last updated: July 9, 2026*
