# Google Play Relaunch With New Listing — Master Guide

**Status:** Old listing `ai.motivefx.app` / MotiveFX.AI is suspended (appeal denied). Do **not** upload to that app. Relaunch only as a **new** Play app.

Locked identity:

| Field | Value |
|-------|-------|
| Play display name | **MotiveFX** |
| Package / applicationId | **`com.motivefx.app`** |
| Version / versionCode | **1.0.0 / 1** |
| Expo slug | `motivefx-android` |
| URL scheme | `motivefx` |

Master plain checklist: [`docs/play-relaunch/CHECKLIST.txt`](./play-relaunch/CHECKLIST.txt)  
Audit log for this pass: [`docs/play-relaunch/CLEAN_STATUS.md`](./play-relaunch/CLEAN_STATUS.md)

---

## 1. Pre-submit code checklist (verified clean)

Confirm before any EAS production build:

- [x] `mobile/app.json`: name **MotiveFX**, package **`com.motivefx.app`**, version **1.0.0**, versionCode **1**
- [x] Do **not** reuse package **`ai.motivefx.app`** for Android
- [x] Android native Play-safe mode: betting/predictions desks are odds/event **intel monitors**; sportsbook / prediction-market app handoffs off; bet/position **ledgers hidden** on Android native
- [x] No Android path opens `/pricing`, Stripe, or web subscription management for digital goods
- [x] `EXPO_PUBLIC_IAP_ENABLED` is **`false`** in `mobile/eas.json` preview + production until Play Billing is fully configured and verified
- [x] Soft auth timeouts (no `AbortController.abort()` on auth fetch)
- [x] WebView load watchdog + Retry; nested scroll enabled
- [x] In-app **Delete account** (auth screen + Account modal) + public `https://www.motivefxai.com/data-deletion`
- [x] Privacy / Terms: `https://www.motivefxai.com/privacy` · `https://www.motivefxai.com/terms`
- [x] Permissions in app.json: `INTERNET`, `VIBRATE` only; Expo defaults for storage / `SYSTEM_ALERT_WINDOW` blocked
- [x] Auth / age-gate user-facing brand = **MotiveFX** (not MotiveFX.AI)
- [ ] If building locally (not EAS), run `npx expo prebuild --platform android --clean` so native `applicationId` is not a stale `ai.motivefx.app`
- [ ] Physical-device smoke test completed (section 8 below)
- [ ] Store listing assets ready (section 4)
- [ ] Play Console Policy status checked — account must allow publishing a new app

Do **not** claim Google Play Billing is live. Purchase CTAs stay non-steering until RC Android key + Play products + entitlement sync are verified end-to-end.

---

## 2. EAS production AAB (when ready)

From repo root:

```bash
cd mobile
eas build --platform android --profile production
```

Or: `npm run build:android:production` inside `mobile/`.

Notes:

- Profile `production` → `app-bundle` (AAB), `autoIncrement: false` (keeps versionCode **1** for first new-package upload).
- Preview APK for phone smoke: `eas build --platform android --profile preview`
- If Expo links the wrong project, run `eas init` from `mobile/`, commit the new `extra.eas.projectId`, then rebuild.
- After first signed build, verify the upload-key SHA-256 in `apps/site/public/.well-known/assetlinks.json` matches Play App signing / upload cert (package must be **`com.motivefx.app`**). Redeploy the site if the fingerprint changes.
- Do **not** run `eas submit` to the suspended listing.

---

## 3. Play Console — create the NEW app

1. Open [Google Play Console](https://play.google.com/console) → **Create app** (never “upload” into MotiveFX.AI / `ai.motivefx.app`).
2. Exact fields:

| Field | Enter |
|-------|--------|
| App name | **MotiveFX** |
| Default language | English (United States) or your primary locale |
| App or game | **App** |
| Free or paid | **Free** |
| Declarations | Accept Play policies / US export laws as prompted |

3. After creation, under **Release → Setup → App integrity / App signing**, note that the package must match **`com.motivefx.app`** (comes from the AAB; you cannot change it later).
4. **Do not** transfer or clone the suspended app listing.

Suggested category: **Finance** or **News & Magazines** (intelligence/research). Avoid **Casino** / gambling categories unless you have confirmed gambling-policy eligibility.

---

## 4. Store listing assets needed

Prepare before review:

| Asset | Notes |
|-------|--------|
| App icon | 512×512 PNG (matches adaptive icon brand) |
| Feature graphic | 1024×500 |
| Phone screenshots | ≥2; show **login**, **monitor-only desks**, **account / delete**, **signals/watchlists** — **not** bet slips, “place bet”, sportsbook CTAs, or Polymarket handoffs |
| Short description | ≤80 chars — monitor/intel language only (see `PLAY_STORE_LISTING.md`) |
| Full description | Informational market intelligence; explicit “not a sportsbook / not brokerage” |
| Privacy policy URL | `https://www.motivefxai.com/privacy` |
| App website | `https://www.motivefxai.com` |
| Support email | `support@motivefx.ai` (or Console contact email) |
| Data deletion URL | `https://www.motivefxai.com/data-deletion` |

Copy drafts: [`docs/PLAY_STORE_LISTING.md`](./PLAY_STORE_LISTING.md)

---

## 5. Data Safety / content rating / target audience

### Data Safety

Declare only what the app actually collects, typically:

- Account info (email, user ID)
- App activity / diagnostics as applicable
- User-entered market watchlists / holdings if stored
- No payment card numbers stored by Motive (Stripe/Play hold billing when used)

Align answers with Privacy Policy. Account deletion must be available in-app and via the public URL.

### Content rating (IARC questionnaire)

Answer honestly for financial content and **sports/event-market intelligence** references. Expect 18+ / mature where betting-adjacent content exists, even if monitor-only. Complete **Financial features** declaration if prompted.

### Target audience

Do **not** target children. Age gate is 18+.

---

## 6. Pricing & distribution

- App is **Free**.
- Digital subscriptions: **not sold in this Android build** (`EXPO_PUBLIC_IAP_ENABLED=false`). Entitled web accounts still work when signed in.
- When Play Billing is ready later: set RevenueCat Android key + Play products, flip `EXPO_PUBLIC_IAP_ENABLED` to `true`, bump versionCode, re-smoke, then resubmit.
- Countries: start with regions you operate legally; exclude where sports/event intel creates regulatory risk if unsure.
- Review notes must include: demo credentials (no 2FA), age-gate steps, core smoke path, delete-account path, and a plain statement that **Android does not sell digital subscriptions outside Play Billing** and **Play Billing is not claimed live** in this build.

---

## 7. What NOT to do

- Do **not** upload this AAB to the suspended MotiveFX.AI / `ai.motivefx.app` listing.
- Do **not** reuse package `ai.motivefx.app` or listing name **MotiveFX.AI**.
- Do **not** claim IAP / Play Billing is live.
- Do **not** put “subscribe on our website” in the store listing or in-app CTAs.
- Do **not** show bet-placement, sportsbook deep links, or prediction-venue handoffs in screenshots or the Android native shell.
- Do **not** force `?demo=1` reviewer landmines.
- Do **not** submit without a physical-device smoke test.

---

## 8. Reviewer smoke test (physical Android)

- [ ] Fresh install → 18+ age gate
- [ ] Register / sign-in (no canceled-fetch / frozen button)
- [ ] Terminal loads; scroll / taps / back / retry / sign-out work
- [ ] Betting/predictions (if visible) read as **intel monitors**, no sportsbook handoff, no bet ledger entry UI
- [ ] Account deletion path visible and testable
- [ ] Offline / failed network shows Retry
- [ ] No path opens `/pricing`, Stripe, or browser checkout for digital goods
- [ ] No CTA claims Play Billing is available

---

## 9. Post-submit monitoring

- Watch Play Console **Policy status**, pre-launch report, and review replies daily.
- Keep versionCode discipline: every policy fix → new versionCode.
- If rejected for gambling impression: hide betting/predictions desks entirely on Android before resubmitting.
- If rejected for payments: re-verify no web checkout URLs and that `IAP_ENABLED` remains false until billing is real.
- After approval: monitor crashes/ANRs; do not re-enable IAP without a verified Play Billing path.

---

## Decision gate

Proceed only when:

- [x] New package + app name locked (`com.motivefx.app` / MotiveFX)
- [x] Play-safe Android native gates on; payment steering blocked; IAP flag off
- [ ] Account Policy status allows a new listing
- [ ] Smoke test + assets + Data Safety + content rating complete
- [ ] You are uploading to a **new** app, not the suspended one
