# App Store Guideline 3.1.1 — Resolution Center Reply

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Rejected build:** 1.0.0 **(22)**  
**Fix deploy:** Web terminal + API (no new binary required if build 22 is already uploaded)

---

## Resolution Center — paste reply

```
Hello App Review Team,

Thank you for the feedback on MotiveFX.AI (Guideline 3.1.1). Please retest with a fresh install of build 1.0.0 (22). We have deployed updated web content served inside the iOS shell at www.motivefxai.com/terminal — no new binary is required for these fixes.

### 3.1.1 — In-App Purchase / outside subscriptions

The iOS app is a free informational market-insights reader:

• There are no in-app purchases and no subscription purchase CTAs anywhere in the iOS app.
• We are not submitting IAP products because nothing is sold in the iOS app.
• Signing in (optional) only saves preferences and tracked holdings — it does not unlock exclusive paid digital content that guest users lack on iOS.
• Guest and signed-in users receive the same monitor-only market insights in the iOS app.
• All subscription, pricing, Stripe, and billing language has been removed from iOS-reachable UI (auth screen, legal pages, module gates, AI assistant, account settings).
• Links to web pricing / Stripe checkout are blocked in the iOS WebView shell.

How to verify:
1. Launch the app and tap "Continue without account" — all market desks are viewable.
2. Sign in with any account (including a web-paid account) — content remains the same free reader experience with no upgrade prompts.
3. Open Privacy / Terms from the footer — iOS-specific reader-only legal copy with no billing sections.
4. Attempt to navigate to /pricing — blocked with a message that purchases are not available in the iOS app.

Privacy Policy: https://www.motivefxai.com/terminal/?page=privacy
Data deletion: https://www.motivefxai.com/terminal/?page=data-deletion (also Delete account in-app when signed in)

Thank you,
MotiveFX.AI team
```

---

## Short Review Notes (metadata)

```
Resubmission for 3.1.1 free reader. Build 1.0.0 (22).

1) iOS is a free informational reader — no IAP products; web subscriptions do not unlock exclusive iOS digital content; same insights for guest and signed-in users.
2) No subscribe / pricing / Stripe / billing CTAs in the iOS app. Sign-in is optional (preferences only).
3) Age assurance: birth year 18+ before content. Gambling = Yes in Age Rating (monitor-only odds/prediction intel; not a wagering venue).
```

---

## What changed (web deploy)

| Area | Fix |
|------|-----|
| Auth (native + web modal) | Optional sign-in for preferences; no subscription/unlock copy |
| Privacy / Terms / Data deletion | iOS variants — no Stripe/IAP/billing sections |
| Chief of Finance | No "active plan" or "View plans" on iOS |
| useAutoAnalyze | Neutral error copy on iOS (no "Subscribe to unlock") |
| App footer | Hide legal pack + cookies links that expose billing on iOS |
| auth/me + modules API | `isTrustedNativeReaderRequest` clamps paid flags server-side |
| TerminalScreen | Guest bar + billing URL blocks (already present; copy tightened) |

---

## Mazen checklist

- [x] Deploy site/API (iOS free-reader entitlements + UI) to production
- [ ] Paste Resolution Center reply above
- [ ] Paste Short Review Notes above
- [ ] Resubmit build 22 (or upload new binary only if ASC requires a fresh build)
- [ ] Confirm Gambling = Yes in App Store Connect Age Rating (2.3.6)

---

## New binary needed?

**Likely no** — these fixes are primarily in the web terminal served at `www.motivefxai.com/terminal`. Build 22 already includes the native WebView shell, billing URL blocks, and free-reader token injection. Deploy the web/API changes and ask App Review to retest build 22.

Upload a new binary only if App Review insists on a fresh build after the web deploy.
