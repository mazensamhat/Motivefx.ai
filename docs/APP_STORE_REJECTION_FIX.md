# App Store Rejection Fix — MotiveFX.AI

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Rejected builds:** 1.0.0 **(9)** / **(11)** (App Store Connect; build 11 reviewed ~Aug 5)  
**Also relevant:** Jul 15 gender / IAP / age notes  
**Resubmit binary:** 1.0.0 **(18)**  

**Path for this resubmit:** free informational reader on iOS + guest browse (no IAP products submitted).

---

## What Apple cited

| Guideline | Evidence | Root cause / fix |
|-----------|----------|------------------|
| **5.1.1(v) — Login wall (NEW)** | App requires register/login before market insights that are not account-based. | iOS native shell now enters **guest/demo terminal after age gate** — no forced Auth. Sign-in optional from guest bar / Account. |
| **5.1.1 — Gender (Jul 15)** | Gender collection concern. | Confirmed: signup = email + password + legal consents only. No sex/gender fields in iOS or web onboarding. |
| **2.1(a) — Black screen** | Blank dark navy screen on launch. | Fixed in c749e65 / build 17; retained in **18** (branded loader until WebView `onLoadEnd`, remount on WKWebView death, load watchdog). |
| **2.1(b) + 3.1.1 — Subscriptions / IAP** | App references subscriptions; IAP products not submitted; paid digital via non-IAP. | iOS is a **free reader**: IAP forced off; no subscribe CTAs, no `/pricing` Safari, no “manage subscription on web”, no billing copy that implies paid unlock without IAP. WebView CSS + blocks hide pricing. |
| **2.3.6 — In-App Controls / Age Assurance** | Age rating / controls accuracy. | Birth-year **18+ age gate on first launch** (before content). In Connect: Age Assurance = Yes; do **not** claim Parental Controls unless you ship real parental/PIN controls. |

---

## What we fixed (build 18)

### A) 5.1.1(v) — Guest browse on iOS

- After age gate → **Terminal** with `?demo=1` when no session (market insights without account).
- Auth is **optional** (`Continue without account` / guest bar **Sign in**).
- Android may still require sign-in before terminal.
- Files: `mobile/src/navigation/RootNavigator.tsx`, `AuthScreen.tsx`, `TerminalScreen.tsx`

### B) 2.1(a) — Black screen

- Keep branded MotiveFX.AI loader until WebView paints; remount on process death; watchdog → Retry.
- Files: `TerminalScreen.tsx`, `RootNavigator.tsx` (unchanged behavior from 17)

### C) 2.1(b) + 3.1.1 — Free reader (no IAP)

- `isIapConfigured()` always `false` on iOS until ASC products + RevenueCat are live.
- No purchase / restore / subscription upsells in iOS shell or injected WebView.
- Block `/pricing`, Stripe, checkout URLs (same as Play-safe).
- Web: hide `TierPricing`, billing fine print, win-hook upgrade, subscribe CTAs on iOS native shell.
- Auth disclaimer: free informational reader — no IAP claims.

### D) 5.1.1 Gender

- Register API + mobile register: email, password, acceptTerms, acceptPrivacy only.
- Generational setup: no gender UI; sync uses prefer_not_to_say.

### E) 2.3.6 Age assurance

- Native `AgeGateScreen` birth year before content (still before guest terminal).
- Review Notes: “Age assurance: birth year gate on first launch before content.”

### Build number

- `mobile/app.json` → `ios.buildNumber` **18**
- `mobile/src/config.ts` → `IOS_BUILD_NUMBER` **18**

---

## App Store Connect — age rating metadata (do this in ASC UI)

1. Open the app → **App Information** → **Age Ratings** (or the age rating questionnaire on the version).
2. Under **In-App Controls** / parental features:
   - Set **Age Assurance** = **Yes** (we have a birth-year 18+ gate).
   - Set **Parental Controls** = **No** unless you ship real parental/PIN gating (we do not).
3. Save and confirm the listing age rating still matches content (sports/event intel).
4. Do **not** resubmit the old build **11** — select binary **1.0.0 (18)** after EAS upload.

---

## Rebuild + upload

```bash
cd mobile
npx eas-cli build --platform ios --profile production --non-interactive

# After green:
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

**Also deploy the terminal web bundle** so iOS free-reader UI (no TierPricing / no subscribe CTAs) is live on `www.motivefxai.com/terminal` before review.

---

## Resolution Center — paste reply

See also Desktop file: `C:/Users/Mazen/Desktop/assets/APP_STORE_RESOLUTION_CENTER_REPLY.txt`

```
Hello App Review Team,

Thank you for the feedback on MotiveFX.AI (guidelines 5.1.1, 2.1, 3.1.1, and 2.3.6). Please retest with a fresh install of build 1.0.0 (18).

### 5.1.1(v) — Account / login not required for market insights

Market insights in this app are not account-based. On iOS, after the age gate, users enter the Home / terminal in guest (demo) browse mode and can view market insights without registering or signing in. Creating an account is optional (saved preferences, delete account, etc.) via Sign in from the guest bar or Account.

Review path:
1) Age verification (birth year 18+)
2) Continue into Home / terminal — no forced login wall
3) Optional: Sign in from the guest bar if desired

### 5.1.1 — Gender

We do not collect sex or gender during signup or onboarding. Registration requires only email, password, and legal consents. Optional experience cohort is not gender.

### 2.1(a) — App Completeness (blank screen)

We fixed a cold-start race where the loading UI could dismiss before the terminal WebView painted. Build 18 keeps a branded MotiveFX.AI loader until the terminal is ready, recovers from WKWebView process termination with Retry, and keeps reviewers inside the Home terminal (Ops Console and web /login routes are not used as the primary iOS path).

### 2.1(b) + 3.1.1 — Subscriptions / In-App Purchase

This iOS build is a free informational reader. There are no in-app purchases, no subscription purchase CTAs, and no links to purchase digital content on the website (including /pricing in Safari). We are not claiming StoreKit / IAP products in this binary. Paid digital unlocks are not offered inside the iOS app in this submission.

### 2.3.6 — Age Assurance / In-App Controls

Age assurance: a birth-year gate on first launch before content. Users must confirm they are 18+. We do not implement Parental Controls (PIN / guardian restrictions) in this app — please treat Age Assurance only in the age rating questionnaire.

Privacy Policy: https://www.motivefxai.com/privacy
Data deletion: https://www.motivefxai.com/data-deletion (also Delete account in-app when signed in)

Thank you,
MotiveFX.AI team
```

---

## Short Review Notes (metadata)

```
Resubmission for 5.1.1(v) login wall, 5.1.1 gender, 2.1 blank screen, 2.1b/3.1.1 free no IAP, 2.3.6 age gate. Build 1.0.0 (18).

1) After age gate → Home/terminal guest browse (no forced login). Sign-in optional.
2) Blank screen fixed — branded loader until terminal WebView loads.
3) Free informational reader — no IAP, no /pricing purchase CTAs in the iOS app.
4) No gender collection at signup.
5) Age assurance: birth year 18+ gate on first launch before content.
```

---

## Mazen checklist

- [ ] Deploy terminal web (free-reader iOS UI) to production
- [ ] EAS iOS production build **1.0.0 (18)**
- [ ] In App Store Connect: select build **18** (do not resubmit 11)
- [ ] Fix age rating: Age Assurance = Yes; Parental Controls = No (unless true)
- [ ] Paste Resolution Center reply (this doc or Desktop txt)
- [ ] Paste Short Review Notes + demo credentials if still useful for signed-in extras
- [ ] Submit for review
