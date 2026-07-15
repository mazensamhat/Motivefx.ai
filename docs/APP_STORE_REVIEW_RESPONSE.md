# App Store Review Response — MotiveFX.AI



**App:** MotiveFX.AI (`ai.motivefx.app`)  

**Build for resubmit:** Version **1.0.0** (build **11**)  

**Device referenced:** iPad Air 11-inch  




---

## NEXT STEPS (ordered) — do these in App Store Connect

**Current binary:** EAS production build for **1.0.0 (11)** (autoIncrement from 10).  
**Build logs:** https://expo.dev/accounts/msamhat/projects/motivefx/builds/391050bb-282d-4a54-89df-0b663307a04e  

**Production terminal:** Vercel auto-deployed `main` @ `d1beab8` (site rebuild runs `scripts/build-terminal.mjs`). Live `/terminal/` includes birth-year AgeGate + onboarding `prefer_not_to_say` (no gender UI). Companion billing opens Safari to the website — **do not create fake IAP products** for this resubmit.

1. **Wait for EAS build 11 to finish** (link above). When green, submit to App Store Connect.
2. **Age Rating questionnaire (2.3.6):** Re-open Age Rating. Prefer **Age Assurance = Yes** (matches birth-year 18+ gate). Do **not** claim Parental Controls / In-App Controls unless you ship real parental/PIN controls. Keep gambling / relevant descriptors accurate.
3. **Paste Resolution Center reply** from the Suggested reply (full) section below (gender removed, companion/Safari billing, age gate).
4. **Review Notes for the new build:** Paste Short Review Notes below; call out build **1.0.0 (11)**, iPad Air 11-inch if still relevant, and that subscriptions are managed on the website in Safari.
5. **Submit build 11 for review**, then **reply in Resolution Center** that the new build addresses 5.1.1(v), 3.1.1, and 2.3.6.

### Commands (if you need them locally)

```bash
cd mobile
# Build already started non-interactively; re-run only if needed:
npx eas-cli build --platform ios --profile production --non-interactive

# After build succeeds — submit to App Store Connect:
npx eas-cli submit --platform ios --profile production --latest --non-interactive
# If ASC API key / Apple credentials prompt: run without --non-interactive once and complete login.
```

Optional: App Store Connect → My Apps → MotiveFX.AI → select build **11** → Submit for Review.

---

Paste the sections below into App Store Connect → Resolution Center / Review Notes.



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



This build is an **account companion / viewer**. It does **not** sell digital subscriptions or unlock paid content via Stripe (or any non-IAP payment) inside the app.



- Native app: no in-app Stripe Checkout; billing/pricing/checkout URLs open in **Safari** (external browser).

- In the embedded terminal (WebView), subscribe / “Start free trial” purchase flows are replaced with **“Manage subscription on website”**, which opens Safari to `https://www.motivefxai.com/pricing`.

- Users who already purchased on the website can **sign in** and access entitled markets (multiplatform account access). Free / demo / simulation content remains available without purchase.

- **StoreKit / Apple IAP** for native subscription purchase is planned for a follow-up release. This interim model avoids non-IAP digital goods sales inside the binary.



### Guideline 2.3.6 — Age Rating / In-App Controls



The app includes sports-betting and prediction-market **intelligence** modules (informational; not a bookmaker).



We implemented a **birth-year 18+ age assurance gate on first launch** (before sign-in). Continue is enabled only when the entered birth year implies age ≥ 18. Under-18 users are blocked. The same verification is used in the web terminal on first open (and as a backup on betting / predictions modules).



**Please confirm Age Rating answers in App Store Connect:**



1. Open **App Information → Age Ratings**.

2. For **In-App Controls** / Parental Controls / Age Assurance: select the option that matches **Age Assurance present** (we require birth year and age ≥ 18 before use), **or** if your questionnaire only offers Parental Controls vs None and Parental Controls was checked incorrectly, set **In-App Controls = None** and rely on our age gate + content descriptors for gambling-related material.

3. Ensure **Gambling / Contests** (or equivalent) descriptors accurately reflect sports-betting *intelligence* content (simulated picks / research — not real-money wagering inside the app).



We are not claiming system-level Parental Controls (Screen Time-style). The in-app control is **age assurance (18+) via birth year**.



### How to test



1. Fresh install (or clear app data) → **Age verification** appears **before** sign-in. Enter a birth year → Continue enables only if age ≥ 18. Under-18 is blocked.

2. Register with email/password only → **no gender fields** anywhere in signup or first-run personalization.

3. Sign in → terminal loads; tap any Subscribe / trial CTA → **Safari** opens to pricing (no Stripe Checkout sheet inside the app).



Thank you,  

MotiveFX.AI team



---



## Short Review Notes (metadata field)



```

Resubmission for 5.1.1(v), 3.1.1, 2.3.6.



1) Gender not collected in onboarding/signup — cohort only; sex/gender never shown on first run.

2) Companion app — no in-app IAP yet; no Stripe checkout in-app. “Manage subscription on website” opens Safari. Web-purchased accounts can sign in. StoreKit planned next.

3) Birth-year 18+ age gate on first launch (before auth); under-18 blocked. Same gate on web terminal open. Age Rating: age assurance = Yes; do not claim Parental Controls unless accurate.

```



---



## Mazen checklist in App Store Connect



### Before upload



- [ ] Deploy updated **web terminal** to production (`pnpm build:terminal` + site deploy) so native WebView gets companion billing + first-launch age gate (no gender in onboarding).

- [ ] EAS iOS build with `version` **1.0.0** / `buildNumber` **11** (or next autoIncrement).

- [ ] Submit build **11** (or newer) for review.



### Age Rating (2.3.6)



- [ ] Re-open Age Rating questionnaire.

- [ ] If **Parental Controls** was selected but the app only has 18+ birth-year assurance: either  

  - set Parental Controls / In-App Controls to **None** and keep Gambling descriptors, **or**  

  - select **Age Assurance** if that option exists (preferred — matches the birth-year gate).

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


