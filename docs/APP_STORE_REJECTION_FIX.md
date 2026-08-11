# App Store Rejection Fix — MotiveFX.AI

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Rejected build:** 1.0.0 **(18)** — Submission `79d32ede-7422-4453-a1a0-e0430523e9b0` (Aug 11, 2026)  
**Resubmit binary:** 1.0.0 **(19)**  

**Path for this resubmit:** Path B — true free informational reader on iOS (no IAP products; web subscriptions do not unlock exclusive iOS digital content).

---

## What Apple cited (Aug 11, 2026)

| Guideline | Evidence | Root cause / fix |
|-----------|----------|------------------|
| **2.3.6 — Accurate Metadata** | App includes tips/tools/predictions related to **real money gambling/betting**. Must select **Yes** for **Gambling** in Age Rating on App Information. | **Connect metadata** (not binary-only). Set Gambling = Yes; age assurance 18+ remains. Desks are **monitor-only odds/intel**, not a casino / wagering venue. |
| **3.1.1 — In-App Purchase** | App **accesses digital content purchased outside the app (Subscriptions)** but that content isn’t available via IAP. | Free-reader claim failed: signing into a **web Pro/paid** account (or residual gating) still unlocked paid digital content without IAP. **Build 19** forces identical free-reader entitlements on iOS for every user — guest or web-subscribed. |

---

## What we fixed (build 19)

### A) 3.1.1 — True free reader (Path B)

On **iOS native** (`MotiveFXNative` + iOS UA / `Platform.OS === "ios"`):

1. **No subscription unlock differences** — web Pro/Ultra/Stripe accounts do **not** unlock exclusive digital features free users lack.
2. Server returns `iosAppStoreReaderPlan()` for iOS App Store requests (modules, auth/me, sync-status, resolveAccess, and entitlements via `entitlementsPlanForUser`).
3. Client `useModules` forces `iosFreeReaderPlan()` — ignores server paid flags / site plan merge; no win-hook upsells; no simulation upsell framing.
4. **No** subscribe / pricing / Stripe / “manage on web” / “subscription active” CTAs in the iOS shell (TierPricing null, ModulePricing null, FeatureGate no upgrade walls, CSS hide belt-and-suspenders).
5. **Do not** ship StoreKit IAP in this pass (`isIapConfigured()` stays false on iOS). IAP is the later path if paid iOS is desired.
6. Predictions / Bets desks remain **monitor-only odds/intel** (gambling *content* for age rating; not a place to wager).

Android Play-safe paths are unchanged.

### B) 2.3.6 — Gambling metadata

- Binary: desks already labeled monitor-only / informational.
- **You must set Gambling = Yes** in App Store Connect Age Rating (steps below).

### Build number

- `mobile/app.json` → `ios.buildNumber` **19**
- `mobile/src/config.ts` → `IOS_BUILD_NUMBER` **19**

---

## App Store Connect — exact clicks (Gambling = Yes)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **MotiveFX.AI**.
2. In the left sidebar under **General**, open **App Information**.
3. Find **Age Ratings** (or **Age Rating** questionnaire) → **Edit** / pencil.
4. In the questionnaire, find **Gambling** (or “Contests / Gambling / Contests with cash prizes” / similar — wording varies by ASC UI version).
5. Select **Yes** for Gambling (app includes sports odds / prediction-market **intel** related to real-money gambling topics).
6. Confirm **Age Assurance** = **Yes** (birth-year 18+ gate on first launch).
7. **Parental Controls** = **No** unless you ship real parental/PIN controls (we do not).
8. **Save**.
9. On the version you’re submitting, select binary **1.0.0 (19)** after EAS upload completes.
10. Paste the Resolution Center reply → **Submit for Review**.

---

## Rebuild + upload

```bash
cd mobile
npx eas-cli build --platform ios --profile production --non-interactive

# After green:
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

**Also deploy the site/terminal web** so iOS free-reader entitlement APIs and UI are live on `www.motivefxai.com` before review.

---

## Resolution Center — paste reply

See also Desktop file: `C:/Users/Mazen/Desktop/assets/APP_STORE_RESOLUTION_CENTER_REPLY.txt`

```
Hello App Review Team,

Thank you for the feedback on MotiveFX.AI (guidelines 2.3.6 and 3.1.1). Please retest with a fresh install of build 1.0.0 (19).

### 2.3.6 — Accurate Metadata (Gambling)

We have set / are setting Gambling = Yes in Age Rating on the App Information page. The app includes monitor-only sports odds and prediction-market intelligence related to real-money gambling topics. It is not a casino, sportsbook, or wagering venue — users cannot place bets or wagers inside the app. Age assurance remains in place: a birth-year gate requires users to confirm they are 18+ before content.

### 3.1.1 — In-App Purchase / outside subscriptions

Build 19 on iOS is a true free informational reader:

• There are no in-app purchases and no subscription purchase CTAs in the iOS app.
• We are not submitting IAP products because nothing is sold in the iOS app in this submission.
• Signing in with a web-subscribed (or any) account does not unlock exclusive paid digital content that free / guest users lack on iOS — the same monitor-only market insights are available to everyone in the iOS app.
• Links to web pricing / Stripe checkout for digital unlocks are blocked in the iOS shell.

Privacy Policy: https://www.motivefxai.com/privacy
Data deletion: https://www.motivefxai.com/data-deletion (also Delete account in-app when signed in)

Thank you,
MotiveFX.AI team
```

---

## Short Review Notes (metadata)

```
Resubmission for 2.3.6 Gambling metadata + 3.1.1 free reader. Build 1.0.0 (19).

1) Age Rating: Gambling = Yes (monitor-only odds/prediction intel; not a wagering venue). Age assurance: birth year 18+ before content.
2) iOS is a free informational reader — no IAP products; web subscriptions do not unlock exclusive iOS digital content; same insights for guest and signed-in users.
3) No subscribe / pricing / Stripe CTAs in the iOS app.
```

---

## Mazen checklist

- [ ] Deploy site/API (iOS free-reader entitlements) to production
- [ ] EAS iOS production build **1.0.0 (19)**
- [ ] In App Store Connect: **App Information → Age Rating → Gambling = Yes → Save**
- [ ] Select binary **19** (do not resubmit 18 alone for 3.1.1)
- [ ] Paste Resolution Center reply
- [ ] Paste Short Review Notes
- [ ] Submit for review

---

## Later (not this pass)

If you want paid digital features on iOS later: implement StoreKit / RevenueCat IAP, submit IAP products in ASC, and remove the free-reader entitlement override. See `docs/APP_STORE_IAP_SETUP.md`.
