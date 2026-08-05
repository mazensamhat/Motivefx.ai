# App Store Review Response — MotiveFX.AI

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Build for resubmit:** Version **1.0.0** (build **18**)  
**Primary fix doc:** [`docs/APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md)

**Device referenced:** iPad Air 11-inch  

---

## NEXT STEPS (ordered) — do these in App Store Connect

**Current binary:** EAS production build for **1.0.0 (18)**.  
Paste reply: Desktop `assets/APP_STORE_RESOLUTION_CENTER_REPLY.txt` or the block in the rejection fix doc.

1. **Wait for EAS build 18 to finish.** When green, submit / select in App Store Connect. **Do not resubmit build 11.**
2. **Age Rating questionnaire (2.3.6):** **Age Assurance = Yes** (birth-year 18+ gate). **Parental Controls = No** unless you ship real parental/PIN controls.
3. **Paste Resolution Center reply** covering 5.1.1 gender, 5.1.1(v) login wall, 2.1 blank screen, 2.1b/3.1.1 free no IAP, 2.3.6 age gate.
4. **Review Notes:** Paste Short Review Notes from [`APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md); call out build **1.0.0 (18)**.
5. **Deploy terminal web** so iOS free-reader UI is live, then **Submit** for review.

### Commands

```bash
cd mobile
npx eas-cli build --platform ios --profile production --non-interactive
# After green:
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

---

## Suggested reply (full)

Use the Resolution Center paste block in [`APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md) or  
`C:/Users/Mazen/Desktop/assets/APP_STORE_RESOLUTION_CENTER_REPLY.txt`.

### Guideline 5.1.1(v) — Login wall

iOS: age gate → guest/demo terminal. Account optional.

### Guideline 5.1.1(v) — Gender

Gender is not collected during onboarding or account creation.

### Guideline 2.1(a) — Blank screen

Branded loader until WebView ready (retained from build 17 → 18).

### Guideline 2.1(b) + 3.1.1 — IAP

This build: **free informational reader** — no IAP, no web purchase steering.

### Guideline 2.3.6 — Age Rating / In-App Controls

Birth-year 18+ age assurance on first launch before content. Not Parental Controls.

---

## Short Review Notes (metadata field)

```
Resubmission for 5.1.1(v) login wall, 5.1.1 gender, 2.1 blank screen, 2.1b/3.1.1 free no IAP, 2.3.6 age gate. Build 1.0.0 (18).

1) After age gate → Home/terminal guest browse (no forced login). Sign-in optional.
2) Blank screen fixed — branded loader until terminal WebView loads.
3) Free informational reader — no IAP, no /pricing purchase CTAs in the iOS app.
4) No gender collection at signup.
5) Age assurance: birth year 18+ gate on first launch before content.
```
