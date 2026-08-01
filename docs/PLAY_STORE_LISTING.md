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
| **Pricing (public web)** | `https://www.motivefxai.com/pricing` |
| **Product preview (no login)** | `https://www.motivefxai.com/demo` |

## Billing (critical for store review)

**Do not** tell Play users inside the Android app to buy digital subscriptions on the website. That is Payments steering and is a common repeated-rejection cause.

**Current Android policy (1.0.4+):**
- No in-app CTAs that open `motivefxai.com/pricing` or Stripe checkout for digital goods
- When Google Play Billing is configured (RevenueCat Android key + Play products), sell subscriptions through Play Billing only
- Until Play Billing is live, the app must not offer purchase buttons that open the web

**Store listing** should describe the product as informational market intelligence. Avoid “billing only on the website” language that implies the app unlocks paid digital content purchased outside Play.

After Play Billing is verified on device, update this section and re-enable in-app subscribe CTAs that call native IAP only.

## Social profiles (site footer + Play Console)

Use these MotiveFX-owned profiles (do not use MotiveLife URLs):

| Platform | URL |
|----------|-----|
| **Instagram** | `https://www.instagram.com/motivefx.ai/` |
| **Facebook** | `https://www.facebook.com/profile.php?id=61591532050605` |
| **LinkedIn** | `https://www.linkedin.com/company/motivefx-ai/` |

Site footer Follow links default to the URLs above (`apps/site/src/lib/social.ts`). Optional Vercel overrides:

- `SOCIAL_INSTAGRAM_URL`
- `SOCIAL_FACEBOOK_URL`
- `SOCIAL_LINKEDIN_URL`

Play Console: paste the same URLs into contact/social fields when available; always set **website** to `https://www.motivefxai.com`.

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
• Informational only — not personalized financial advice

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
- [ ] Short + full description pasted (**no** “buy on website only” steering)
- [ ] Social / contact fields use MotiveFX Instagram, Facebook, LinkedIn URLs above
- [ ] In-app auth links open Privacy, Terms, and Data deletion
- [ ] In-app Delete account works (native Account / Delete account)
- [ ] Reviewer demo credentials in review notes

See also: `docs/ANDROID_PLAY_STORE.md` · Appeal draft: `docs/PLAY_SUSPENSION_APPEAL.md`
