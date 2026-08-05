# App Store Review Response — MotiveFX.AI

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Build for resubmit:** Version **1.0.0** (build **17**)  
**Primary fix doc:** [`docs/APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md) (2.1.0 blank screen + 5.1.1 privacy / no web purchase steering)

**Device referenced:** iPad Air 11-inch  

---

## NEXT STEPS (ordered) — do these in App Store Connect

**Current binary:** EAS production build for **1.0.0 (17)**.  
See rejection remediations: [`docs/APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md).  
IAP setup (when enabling StoreKit): [`docs/APP_STORE_IAP_SETUP.md`](./APP_STORE_IAP_SETUP.md).

**Before submit:** Confirm privacy + data-deletion URLs live; paste Resolution Center reply from the rejection fix doc. If selling subscriptions in-app, create ASC products and wire RevenueCat first.

1. **Wait for EAS build 17 to finish.** When green, submit to App Store Connect.
2. **Age Rating questionnaire (2.3.6):** Prefer **Age Assurance = Yes** (birth-year 18+ gate). Do **not** claim Parental Controls unless you ship real parental/PIN controls.
3. **Paste Resolution Center reply** from [`APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md).
4. **Review Notes:** Paste Short Review Notes from that doc; call out build **1.0.0 (17)**.
5. **Submit** for review, then reply in Resolution Center.

### Commands

```bash
cd mobile
npx eas-cli build --platform ios --profile production --non-interactive
# After green:
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

---

## Suggested reply (full)

Use the Resolution Center paste block in [`APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md) (covers 2.1.0 + 5.1.1). Legacy notes for gender / IAP / age gate remain below for older threads.

### Guideline 5.1.1(v) — Gender

**Gender is not collected during onboarding or account creation.**

- Registration requires only email, password, and legal consents — no sex/gender fields.
- The terminal personalization flow asks only for experience cohort (and optionally how the user found the app). It does **not** show sex or gender fields.
- Profile sync from onboarding always records sex/gender as **prefer not to say** (not user-selected).

### Guideline 3.1.1 — In-App Purchase

When StoreKit / RevenueCat is configured (`EXPO_PUBLIC_IAP_ENABLED=true` + RC iOS key):

- Subscription group: `Monthly` (ASC reference name)
- Products: `Lite` / `Pro` / `Ultra` / `Ultra.Plus` (monthly) and `Elite` (yearly) — purchased with Apple IAP inside the app.
- Native WebView subscribe CTAs call StoreKit; **Stripe Checkout is not used inside the iOS app**.
- Users can **Restore purchases** from Account settings.
- Free / demo / simulation content remains available without purchase.

This build does **not** steer users to `motivefxai.com/pricing` in Safari for digital subscriptions.

### Guideline 2.3.6 — Age Rating / In-App Controls

The app includes sports-betting and prediction-market **intelligence** modules (informational; not a bookmaker).

We implemented a **birth-year 18+ age assurance gate on first launch** (before sign-in). Continue is enabled only when the entered birth year implies age ≥ 18. Under-18 users are blocked.

---

## Short Review Notes (metadata field)

```
Resubmission for 2.1.0 + 5.1.1. Build 1.0.0 (17).

1) Blank screen fixed — branded loader until terminal loads; no Ops/admin deep link for reviewers.
2) Privacy + data deletion URLs live; Delete account in-app. No gender collection.
3) No web /pricing purchase steering. Store billing when configured.
4) Age gate 18+ → sign in with review credentials → Home terminal.
```

---

## Mazen checklist in App Store Connect

### Before upload

- [ ] Deploy site privacy + terminal native-shell fixes
- [ ] EAS iOS build **1.0.0 / buildNumber 17**
- [ ] (Optional IAP) ASC products + RevenueCat + `EXPO_PUBLIC_IAP_ENABLED=true`
- [ ] Paste Resolution Center reply from `APP_STORE_REJECTION_FIX.md`

### Age Rating (2.3.6)

- [ ] Prefer Age Assurance = Yes (matches birth-year gate)
- [ ] Do **not** claim Parental Controls unless you ship real parental/PIN controls
