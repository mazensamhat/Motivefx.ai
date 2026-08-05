# App Store Rejection Fix — MotiveFX.AI

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Rejected builds:** 1.0.0 **(9)** / **(11)** (App Store Connect)  
**Resubmit binary:** 1.0.0 **(17)**  

---

## What Apple cited

| Guideline | Evidence | Root cause |
|-----------|----------|------------|
| **2.1.0 Performance — App Completeness** | Reviewer screenshot: **full blank dark navy/black screen** (no UI). Other shots showed native sign-in and a working Home/terminal, so the app can work when the WebView finishes. | Cold-start race: session prep cleared the loader **before** the WebView painted → empty dark frame. Failed/redirect navigations to `/login`, `/admin`, or `/app` inside the WebView could also leave a blank or broken surface. WKWebView process death previously left a dead black view. |
| **5.1.1 Legal — Privacy / Data Collection** | Privacy / disclosure mismatch; prior companion copy steered users to **web `/pricing` in Safari** for digital subscriptions. | Sign-in disclaimer (build 9 era): *“subscriptions are managed on the web at motivefxai.com/pricing (opens in Safari)”*. Privacy policy under-described App Store / Play billing and overstated “demographics.” Account deletion / privacy URLs must stay discoverable and accurate. |

Related risk (often filed with payments): **3.1.1 In-App Purchase** — do not direct users to purchase digital content on the website from the iOS app.

---

## What we fixed

### A) Blank screen / completeness

- Keep branded **MotiveFX.AI** loader until WebView `onLoadEnd` (no black gap after session prep).
- Boot splash on age-gate / session restore (never unlabeled black).
- Block `/login`, `/register`, `/admin`, `/app` inside the native WebView; return to native Auth or `/terminal`.
- Remount on iOS `onContentProcessDidTerminate` (not leave black).
- Load watchdog → recoverable **failed** UI with Retry (not infinite spinner/black).
- Hide Ops Console / Site account links in the native shell footer.
- Terminal web auth: native shell posts `motivefx:logout` instead of navigating to `/login?next=/app`.

### B) Privacy 5.1.1 + purchase steering

- Auth disclaimer: **no** Safari / `/pricing` purchase CTAs; store billing only when configured.
- Always-visible Privacy / Terms / Data deletion links on the sign-in screen.
- In-app **Delete account** (sign-in + Account) + `https://www.motivefxai.com/data-deletion`.
- Privacy policy: Apple/Google billing subprocessors; cohort ≠ gender/demographics.
- Info.plist stays minimal (no unused camera/location/tracking strings).
- Bundle / listing name aligned to **MotiveFX.AI**; build tag `1.0.0 (17) · ai.motivefx.app`.

### Files touched (this pass)

- `mobile/src/screens/TerminalScreen.tsx`
- `mobile/src/screens/AuthScreen.tsx`
- `mobile/src/screens/AgeGateScreen.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/config.ts`
- `mobile/app.json` (name + `ios.buildNumber` **17**)
- `mobile/package.json` (`build:ios:production`)
- `web/src/hooks/useAuth.tsx`
- `web/src/App.tsx`
- `web/src/pages/PrivacyPage.tsx`
- `apps/site/src/app/privacy/page.tsx`
- `docs/APP_STORE_REJECTION_FIX.md` (this file)

---

## Rebuild + upload (do not auto-submit unless asked)

```bash
cd mobile

# Optional: enable StoreKit when RevenueCat products are ready (see APP_STORE_IAP_SETUP.md)
# eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_… --scope project
# Then set EXPO_PUBLIC_IAP_ENABLED=true in eas.json production env before building.

npx eas-cli build --platform ios --profile production --non-interactive

# After the build is green in Expo:
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

**Also deploy the site/terminal** so privacy copy + native-shell auth fixes are live:

```bash
# From repo root — whatever you normally use for Vercel / terminal bundle
pnpm build:terminal   # if applicable
# push main → Vercel production
```

Confirm before review:

- [ ] `https://www.motivefxai.com/privacy` loads MotiveFX.AI policy (Apple + Play billing language)
- [ ] `https://www.motivefxai.com/data-deletion` loads
- [ ] App Privacy (Nutrition Labels) match collection practices
- [ ] Review Notes include demo credentials + path below
- [ ] If selling subscriptions in-app: ASC products + RevenueCat + `EXPO_PUBLIC_IAP_ENABLED=true`

---

## Resolution Center — paste reply

```
Hello App Review Team,

Thank you for the feedback on MotiveFX.AI (guideline 2.1.0 and 5.1.1).

### 2.1.0 — App Completeness (blank screen)

We fixed a cold-start race where the loading UI was dismissed before the terminal WebView finished painting, which could present as a full black screen. The app now always shows a branded MotiveFX.AI loading state until the terminal is ready, recovers from WKWebView process termination with Retry, and keeps reviewers inside the Home terminal (Ops Console and web /login routes are not used in the iOS shell).

Please retest with a fresh install of build 1.0.0 (17):
1. Age verification (birth year 18+)
2. Sign in with the provided review account
3. Home / terminal should load with signals UI (not a blank screen)

### 5.1.1 — Privacy / Data Collection

- Privacy Policy: https://www.motivefxai.com/privacy
- Data deletion: https://www.motivefxai.com/data-deletion (also Delete account on the sign-in screen and in Account)
- We do not collect sex/gender during signup; optional experience cohort only
- Payment processors disclosed: Stripe (web) and Apple/Google when in-app store billing is used
- The app no longer directs users to purchase digital subscriptions on the website or open /pricing in Safari

Digital subscriptions, when offered in this app, use Apple In-App Purchase. Web checkout is not available inside the iOS app.

Thank you,
MotiveFX.AI team
```

---

## Short Review Notes (metadata)

```
Resubmission for 2.1.0 + 5.1.1. Build 1.0.0 (17).

1) Blank screen fixed — branded loader until terminal WebView loads; no /admin deep link for reviewers.
2) Privacy: https://www.motivefxai.com/privacy · Data deletion in-app + https://www.motivefxai.com/data-deletion
3) No web /pricing purchase steering. IAP via StoreKit when configured; otherwise existing plan access after sign-in.
4) Age gate 18+ on first launch. Sign in with review credentials → Home terminal.
```

---

## Mazen checklist

- [ ] Deploy site privacy + terminal auth fixes to production
- [ ] EAS iOS production build **1.0.0 (17)**
- [ ] Upload / select build in App Store Connect
- [ ] Paste Resolution Center reply
- [ ] Paste Short Review Notes + demo account
- [ ] Confirm App Privacy labels
- [ ] Submit for review (do not skip Resolution Center reply)
