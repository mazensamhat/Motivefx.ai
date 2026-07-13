# MotiveFX.AI — Google Play store listing fields

Copy these into Play Console → **Grow users** → **Store presence** → **Main store listing** (and **App content** / **Privacy policy** where prompted).

## Required disclosure URLs

| Field | URL |
|-------|-----|
| **Privacy policy** | `https://www.motivefxai.com/privacy` |
| **Account / data deletion** | `https://www.motivefxai.com/data-deletion` |
| **Terms of Service** | `https://www.motivefxai.com/terms` |
| **Marketing / website** | `https://www.motivefxai.com` |
| **Support** | `https://www.motivefxai.com` (or `mailto:support@motivefx.ai`) |
| **Pricing (web billing)** | `https://www.motivefxai.com/pricing` |
| **Product preview (no login)** | `https://www.motivefxai.com/demo` |

## Billing (critical for store review)

**Subscriptions are purchased on the web only** at `https://www.motivefxai.com/pricing`.  
The Android app does **not** sell digital subscriptions in-app (no Play Billing / IAP in v1).

Store listing and in-app copy must say clearly:

> Subscriptions are managed at motivefxai.com. Sign in with the same account on mobile to access your markets. Billing is not available inside the Play Store app.

After Play review approval, keep this model unless/until RevenueCat (or native Play Billing) is intentionally adopted — see `docs/ANDROID_PLAY_STORE.md` and `docs/MOBILE_STRATEGY.md`.

## Social profiles (site footer + bios)

MotiveFX Instagram / Facebook / LinkedIn accounts are **not** linked by default (MotiveLife profiles must not be used).

1. Create MotiveFX-branded accounts when ready.
2. Set Vercel env (Production + Preview) on the marketing site:
   - `SOCIAL_INSTAGRAM_URL`
   - `SOCIAL_FACEBOOK_URL`
   - `SOCIAL_LINKEDIN_URL`
3. Until then, the site footer hides Follow links (or points to `/demo`). Leave Play Console social fields blank or use the website URL only.

Play Console does not always expose Instagram/Facebook/LinkedIn fields; put the website in store listing **website** and developer contact notes.

## Short description (≤80 chars)

```
AI market intel for stocks, crypto, options, sports & prediction markets.
```

## Full description (draft)

```
MotiveFX.AI is an AI market intelligence terminal — informational research only.

Track stocks, crypto, options flow, pink slips, sports betting analytics, and prediction markets (including Polymarket) in one place. Motive Signal™ scores help you prioritize what to research next. Plain-English “Why it matters” briefs explain the context.

What MotiveFX is:
• Research and analytics software
• Educational market intelligence
• Web subscriptions only (billing on motivefxai.com — not in this app)

What MotiveFX is NOT:
• A broker or exchange
• A sportsbook or gambling operator
• Personalized financial, investment, or betting advice

Try the preview (no login): https://www.motivefxai.com/demo
Privacy: https://www.motivefxai.com/privacy
Delete your data: https://www.motivefxai.com/data-deletion
Terms: https://www.motivefxai.com/terms
Learning Center: https://www.motivefxai.com/learn
Motive Signal methodology: https://www.motivefxai.com/motive-signal
```

## Learning Center (public site)

Product tracks live at `https://www.motivefxai.com/learn` — stocks, crypto, options, prediction markets, sports betting, pink slips, plus AI investing and skills tracks.

## Checklist

- [ ] Privacy policy URL set in Play Console App content
- [ ] Data deletion URL set (Account deletion / Data safety)
- [ ] Website = `https://www.motivefxai.com`
- [ ] Short + full description pasted (includes **web billing only**)
- [ ] Social bios link to website with UTM if desired — only after MotiveFX accounts exist
- [ ] In-app auth links open Privacy, Terms, and Data deletion
- [ ] Post-review: confirm Stripe checkout still opens in external browser (not WebView)

See also: `docs/ANDROID_PLAY_STORE.md`
