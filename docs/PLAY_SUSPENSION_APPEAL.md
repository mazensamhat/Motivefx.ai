# Google Play Suspension Appeal — MotiveFX.AI (`ai.motivefx.app`)

**Do not submit this appeal until the checklist at the bottom of this file (and in the companion “before appealing” note) is complete.** A weak appeal after Enforcement Process suspension can escalate toward developer-account termination.

**App:** MotiveFX.AI  
**Package:** `ai.motivefx.app`  
**Remediation binary (target):** version **1.0.4**, versionCode **19** (EAS production build `35f5fae2-f047-4a1e-9c7c-d3603924b82f`, commit `d238c92`)
**Previous production binary under review:** version **1.0.3**, versionCode **17** (EAS `8fa80431-57c5-4be7-98e3-b5753a839052`)

---

## Appeal body (paste into Play Console)

Dear Google Play Review Team,

We are appealing the suspension of MotiveFX.AI (`ai.motivefx.app`) under the Enforcement Process for repeated non-compliance. We take the repeated-rejection pattern seriously. Below is a factual record of prior rejection themes, what we changed, and the process changes we put in place so the same class of issues does not recur.

### Prior rejection themes and remediations

1. **Broken Functionality — app freezing / unresponsive / cannot scroll**  
   - **Seen in:** Android builds through approximately versionCode **11–13** (commits addressing ANR/scroll, including `48b31cf`, `f13918c`).  
   - **Cause:** Hung network calls during auth boot; full-screen WebView loader with no timeout; Android WebView scroll container locked; RevenueCat / billing configured on cold start (ANR risk).  
   - **Fix shipped:** Fetch timeouts; cached-session boot; WebView load watchdog + Retry; nested scroll enabled; deferred IAP configuration until after first interactive load; scroll CSS for the native shell.

2. **Broken Functionality — unresponsive UI (Sign in)**  
   - **Seen in:** version **1.0.3** / versionCode **16–17** (fix commit `87a1600`).  
   - **Cause:** Auth fetch used `AbortController.abort()` after a hard timeout. On React Native/Expo this surfaced as “fetch failed: Fetch request has been canceled,” which reads as a dead Sign in control.  
   - **Fix shipped in 1.0.3:** Soft `Promise.race` timeouts (no abort on auth fetch); actionable error copy; one automatic retry on transient network failures; larger Sign in tap target and clear loading/disabled state.

3. **Payments / external purchase steering (self-identified before this appeal)**  
   - **Risk:** Auth and terminal copy / CTAs directed users to purchase or manage digital subscriptions on the website (`motivefxai.com/pricing`), including iOS-oriented “opens in Safari” language on Android. Native shell fallbacks opened the pricing URL when store billing was not configured. That pattern conflicts with Google Play Payments for digital subscriptions.  
   - **Remediation in 1.0.4** (repo seeds versionCode **18**; uploaded AAB may be higher via EAS `autoIncrement` — confirm exact code):  
     - Removed Android-facing CTAs and copy that steer users to web checkout for digital subscriptions (native auth disclaimer; terminal subscribe / module unlock / simulation CTAs in the MotiveFXNative WebView shell).  
     - Blocked Stripe / `/pricing` / checkout URLs from opening inside or from the Android app shell (`shouldOverrideUrlLoading` / open-external bridge).  
     - Native and WebView subscribe paths no longer fall back to the website; they show a non-steering message when store billing is not configured.  
     - Clarified disclaimer: informational product; store billing for in-app digital subscriptions when offered.  
     - **Note:** The public marketing website still has `/pricing` for browser users. That path is not offered as a purchase CTA inside the Android app shell.

4. **Account deletion**  
   - **Gap:** Public data-deletion policy existed at `https://www.motivefxai.com/data-deletion`, and the web Account UI called delete, but `POST /api/auth/delete-account` was missing (404), and the Android shell lacked a dedicated native deletion entry point.  
   - **Remediation in 1.0.4:** Implemented `POST /api/auth/delete-account` (session cookie or Bearer JWT; password + type `DELETE`); added native **Delete account** from the sign-in screen and **Account** from the terminal chrome.

### Process change (why this stops recurring)

We changed our release process for Play submissions:

1. **Pre-submit policy checklist** covering Payments (no web digital-goods CTAs), Broken Functionality (every primary control + failure/retry path), Account deletion (in-app + public URL), Data Safety alignment, and reviewer demo credentials.  
2. **No Play resubmission** until a physical-device smoke test of: age gate → register/sign-in → terminal load → scroll → sign-out → delete-account path → offline/error Retry.  
3. **Payments gate:** Android builds must not open web pricing/checkout for digital subscriptions. Store billing (Play Billing via RevenueCat) must be fully configured before any in-app purchase CTA is re-enabled.  
4. **Version discipline:** Each policy fix ships under a new `version` / `versionCode` with review notes listing the exact change.

### Product clarification

MotiveFX.AI is predictive market intelligence and research software. It is informational only — not a broker, sportsbook, or source of personalized financial advice. Disclaimers appear on auth and in the terminal.

### Reviewer access

Please use the demo credentials provided in the Play Console review notes for this release (email/password). Age gate: enter a birth year of 18+. After sign-in, the terminal loads; Account → delete path is available from the native chrome.

We respectfully request reinstatement and review of build **1.0.4** (versionCode as uploaded — see AAB) after upload.

Thank you,  
MotiveFX.AI / MotiveFX team

---

## Honesty constraints (internal — do not weaken these in the live appeal)

- Do **not** claim Google Play Billing is live until `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` is set in EAS, Play subscription products exist, and purchase + entitlement sync is verified on a device.  
- Do **not** claim the WebView terminal is a fully native UI. The shell is Age gate → Auth → WebView(`/terminal`).  
- Do **not** submit this appeal against 1.0.3/17; upload **1.0.4** with a new versionCode first.  
- Deploy the site API including `delete-account` **and** native-handoff / terminal middleware fixes before reviewers exercise the app.  
- Do **not** claim “all CTAs removed from the entire product” — only that the **Android app shell** no longer steers to web checkout for digital goods.  
- Confirm the uploaded AAB’s `versionName` / `versionCode` in Play Console and paste those exact numbers into the appeal (EAS `autoIncrement` may bump versionCode past 18).

---

## Before appealing — operator checklist

See the short checklist in the agent handoff / `docs/ANDROID_PLAY_STORE.md` (updated). Minimum:

- [ ] Deploy site API including `/api/auth/delete-account` **and** `/api/auth/native-handoff` (GET+POST) + middleware native-UA fix  
- [ ] Confirm production terminal bundle is the remediating build (`index-M9YeQlZu.js` or newer) — no orphaned Safari/pricing companion assets under `/terminal`  
- [x] EAS production AAB **1.0.4** / versionCode **19** built (`35f5fae2-f047-4a1e-9c7c-d3603924b82f`); upload + device smoke still required before appeal  
- [ ] Review notes: working demo account (no 2FA), age-gate instructions  
- [ ] Data Safety form matches actual collection (email, account ID, app activity)  
- [ ] Store listing no longer tells users to buy subscriptions only on the website  
- [ ] Decide: either finish Play Billing before re-enabling purchase CTAs, or keep purchase CTAs off in the Android shell (`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` unset → CTAs stay off)  
- [ ] Paste exact versionName / versionCode into the appeal body before submit — do not leave “18+”
