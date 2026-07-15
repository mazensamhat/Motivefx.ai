# App Store Review Response — MotiveFX.AI

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Build for resubmit:** Version **1.0.0** (build **9**)  
**Device referenced:** iPad Air 11-inch  

Paste the sections below into App Store Connect → Resolution Center / Review Notes.

---

## Suggested reply (full)

Hello App Review Team,

Thank you for the feedback on MotiveFX.AI. We have addressed each guideline as follows.

### Guideline 5.1.1(v) — Gender

Sex and gender are **optional demographics** only. Users can complete registration and onboarding **without selecting gender**.

- Account creation requires only email, password, and legal consents.
- The terminal personalization flow can be completed with **Apply Experience** without opening demographics.
- If the user opens optional demographics, fields are labeled **(optional)**, default to **Prefer not to say**, and include a **Skip — prefer not to say** action.

### Guideline 3.1.1 — In-App Purchase

This build is an **account companion / viewer**. It does **not** sell digital subscriptions or unlock paid content via Stripe (or any non-IAP payment) inside the app.

- Native app: no in-app Stripe Checkout; billing/pricing/checkout URLs open in **Safari** (external browser).
- In the embedded terminal (WebView), subscribe / “Start free trial” purchase flows are replaced with **“Manage subscription on website”**, which opens Safari to `https://www.motivefxai.com/pricing`.
- Users who already purchased on the website can **sign in** and access entitled markets (multiplatform account access). Free / demo / simulation content remains available without purchase.
- **StoreKit / Apple IAP** for native subscription purchase is planned for a follow-up release. This interim model avoids non-IAP digital goods sales inside the binary.

### Guideline 2.3.6 — Age Rating / In-App Controls

The app includes sports-betting and prediction-market **intelligence** modules (informational; not a bookmaker).

We implemented a lightweight **18+ age assurance gate** on first launch of the iOS app (and module-level age confirmation in the web terminal for betting / predictions).

**Please confirm Age Rating answers in App Store Connect:**

1. Open **App Information → Age Ratings**.
2. For **In-App Controls** / Parental Controls / Age Assurance: select the option that matches **Age Assurance present** (we ask users to confirm they are 18+ before use), **or** if your questionnaire only offers Parental Controls vs None and Parental Controls was checked incorrectly, set **In-App Controls = None** and rely on our age gate + content descriptors for gambling-related material.
3. Ensure **Gambling / Contests** (or equivalent) descriptors accurately reflect sports-betting *intelligence* content (simulated picks / research — not real-money wagering inside the app).

We are not claiming system-level Parental Controls (Screen Time-style). The in-app control is **age assurance (18+)**.

### How to test

1. Fresh install → confirm **18+ age gate** appears before sign-in.
2. Register with email/password only → no gender required.
3. Sign in → terminal loads; tap any Subscribe / trial CTA → **Safari** opens to pricing (no Stripe Checkout sheet inside the app).
4. Optional: open personalization → demographics are skippable.

Thank you,  
MotiveFX.AI team

---

## Short Review Notes (metadata field)

```
Resubmission for 5.1.1(v), 3.1.1, 2.3.6.

1) Gender/sex optional — skip or Prefer not to say; signup never requires gender.
2) Companion app — no in-app IAP yet; no Stripe checkout in-app. “Manage subscription on website” opens Safari. Web-purchased accounts can sign in. StoreKit planned next.
3) 18+ age gate on first launch (and betting/predictions modules on web). Age Rating: age assurance = Yes; do not claim Parental Controls unless accurate.
```

---

## Mazen checklist in App Store Connect

### Before upload

- [ ] Deploy updated **web terminal** to production (`pnpm build:terminal` + site deploy) so native WebView gets companion billing + optional gender UI.
- [ ] EAS iOS build with `version` **1.0.0** / `buildNumber` **9** (or next autoIncrement).
- [ ] Submit build **9** (or newer) for review.

### Age Rating (2.3.6)

- [ ] Re-open Age Rating questionnaire.
- [ ] If **Parental Controls** was selected but the app only has an 18+ confirmation: either  
  - set Parental Controls / In-App Controls to **None** and keep Gambling descriptors, **or**  
  - select **Age Assurance** if that option exists (preferred — matches the new gate).
- [ ] Do **not** claim Parental Controls unless you ship real parental/PIN controls.

### IAP (3.1.1) — this interim build

- [ ] **Do not** create App Store subscription products yet unless you ship StoreKit in the same binary.
- [ ] In Review Notes, paste the short notes above so reviewers know Safari + companion model is intentional.
- [ ] Optional later: External Link Account entitlement (US) if Apple asks for Account → External Purchase Link for “manage on website.”

### When you add StoreKit (follow-up)

- [ ] Create subscription products in App Store Connect mirroring web tiers.
- [ ] Integrate StoreKit / RevenueCat / `react-native-iap`.
- [ ] Server-validate receipts and sync entitlements with the same account as Stripe web.
- [ ] Then you may re-enable in-app purchase CTAs.

---

## Honesty note

**Full StoreKit IAP was not implemented in this pass.** The shipped path is the review-safe **companion / Safari manage subscription** model so the app can be resubmitted without selling digital content via Stripe inside the binary.
