# App Store Review Response — MotiveFX.AI

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Build for resubmit:** Version **1.0.0** (build **12+**)  
**Device referenced:** iPad Air 11-inch  

---

## NEXT STEPS (ordered) — do these in App Store Connect

**Current binary:** EAS production build for **1.0.0 (12+)** with StoreKit / RevenueCat IAP.  
See full setup: [`docs/APP_STORE_IAP_SETUP.md`](./APP_STORE_IAP_SETUP.md).

**Before submit:** Create the five ASC subscription products (exact IDs in IAP setup doc) and wire RevenueCat + EAS secrets + Vercel webhook secret.

1. **Wait for EAS build 12+ to finish.** When green, submit to App Store Connect **with** the subscription products.
2. **Age Rating questionnaire (2.3.6):** Prefer **Age Assurance = Yes** (birth-year 18+ gate). Do **not** claim Parental Controls unless you ship real parental/PIN controls.
3. **Paste Resolution Center reply** from the Suggested reply section below.
4. **Review Notes:** Paste Short Review Notes; call out build **1.0.0 (12+)**, and that subscriptions use **Apple IAP** for all tiers.
5. **Submit** for review, then reply in Resolution Center.

### Commands

```bash
cd mobile
# Set RevenueCat keys first (see APP_STORE_IAP_SETUP.md)
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_… --scope project
npx eas-cli build --platform ios --profile production --non-interactive
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

---

## Suggested reply (full)

Hello App Review Team,

Thank you for the feedback on MotiveFX.AI. We have addressed each guideline as follows.

### Guideline 5.1.1(v) — Gender

**Gender is not collected during onboarding or account creation.**

- Registration requires only email, password, and legal consents — no sex/gender fields.
- The terminal personalization flow asks only for experience cohort (and optionally how the user found the app). It does **not** show sex or gender fields.
- Profile sync from onboarding always records sex/gender as **prefer not to say** (not user-selected).

### Guideline 3.1.1 — In-App Purchase

This build sells MotiveFX intelligence subscriptions via **Apple In-App Purchase** (StoreKit through RevenueCat).

- Subscription group: `motivefx_intelligence`
- Products: Lite / Pro / Ultra / Ultra+ (monthly) and Elite (yearly) — purchased with Apple IAP inside the app.
- Native WebView subscribe CTAs call StoreKit; **Stripe Checkout is not used inside the iOS app**.
- Web / Safari customers may still subscribe via Stripe on motivefxai.com (multiplatform account access).
- Users can **Restore purchases** from Account settings.
- Free / demo / simulation content remains available without purchase.

### Guideline 2.3.6 — Age Rating / In-App Controls

The app includes sports-betting and prediction-market **intelligence** modules (informational; not a bookmaker).

We implemented a **birth-year 18+ age assurance gate on first launch** (before sign-in). Continue is enabled only when the entered birth year implies age ≥ 18. Under-18 users are blocked. The same verification is used in the web terminal on first open (and as a backup on betting / predictions modules).

**Please confirm Age Rating answers in App Store Connect:**

1. Open **App Information → Age Ratings**.
2. For **In-App Controls** / Parental Controls / Age Assurance: select the option that matches **Age Assurance present**, **or** if your questionnaire only offers Parental Controls vs None and Parental Controls was checked incorrectly, set **In-App Controls = None** and rely on our age gate + content descriptors.
3. Ensure **Gambling / Contests** descriptors accurately reflect sports-betting *intelligence* content (simulated picks / research — not real-money wagering inside the app).

We are not claiming system-level Parental Controls. The in-app control is **age assurance (18+) via birth year**.

### How to test

1. Fresh install → **Age verification** before sign-in (≥ 18 required).
2. Register with email/password only → **no gender fields**.
3. Sign in → open Pricing / Subscribe → **Apple IAP sheet** (Sandbox). After purchase, entitled markets unlock for that account.
4. Account → **Restore App Store purchases** works for prior Sandbox buys.

Thank you,  
MotiveFX.AI team

---

## Short Review Notes (metadata field)

```
Resubmission for 5.1.1(v), 3.1.1, 2.3.6.

1) Gender not collected in onboarding/signup — cohort only; sex/gender never shown on first run.

2) IAP: intelligence tiers (Lite–Elite) via StoreKit/RevenueCat inside the app. Stripe only on web/Safari — not in WebView. Restore purchases in Account.

3) Birth-year 18+ age gate on first launch (before auth); under-18 blocked. Same gate on web terminal. Age Rating: age assurance = Yes; do not claim Parental Controls unless accurate.
```

---

## Mazen checklist in App Store Connect

### Before upload

- [ ] Create ASC subscription group + 5 products (exact IDs in `APP_STORE_IAP_SETUP.md`)
- [ ] RevenueCat entitlements `lite|pro|ultra|ultra_plus|elite` + offering + webhook
- [ ] EAS secrets for RC API keys; Vercel `REVENUECAT_WEBHOOK_SECRET`
- [ ] `prisma db push` for Apple IAP columns
- [ ] Deploy site + rebuild terminal (`pnpm build:terminal` / Vercel)
- [ ] EAS iOS build **1.0.0 / buildNumber 12+**
- [ ] Submit build with subscription products for review

### Age Rating (2.3.6)

- [ ] Prefer Age Assurance = Yes (matches birth-year gate)
- [ ] Do **not** claim Parental Controls unless you ship real parental/PIN controls

### IAP (3.1.1)

- [ ] Paid Apps Agreement active
- [ ] All five products created and submitted with the binary
- [ ] Sandbox tester account ready; Review Notes mention IAP path

---

## Honesty note

**StoreKit / RevenueCat IAP is implemented** for all five tiers. Lite/Pro native purchase uses **default market selection** (no in-app market picker yet). Stripe remains for web-only customers.
