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

## Social profiles (site footer + bios)

MotiveFX-specific social pages are not yet published in-repo. Until dedicated MotiveFX accounts go live, use the **Motive brand** profiles documented in `motivelife.ai/docs/AUTO_POST_SETUP.md`:

| Platform | URL |
|----------|-----|
| **Instagram** | `https://www.instagram.com/motivelife.ai/` |
| **Facebook** | `https://www.facebook.com/profile.php?id=61591637157893` |
| **LinkedIn** | `https://www.linkedin.com/company/motivelife-ai` |

Override on the marketing site via env: `SOCIAL_INSTAGRAM_URL`, `SOCIAL_FACEBOOK_URL`, `SOCIAL_LINKEDIN_URL`.

Play Console does not always expose Instagram/Facebook/LinkedIn fields; put these in store listing **website**, developer contact notes, and social bios.

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
• Web subscriptions (billing on motivefxai.com)

What MotiveFX is NOT:
• A broker or exchange
• A sportsbook or gambling operator
• Personalized financial, investment, or betting advice

Privacy: https://www.motivefxai.com/privacy
Delete your data: https://www.motivefxai.com/data-deletion
Terms: https://www.motivefxai.com/terms
Learning Center: https://www.motivefxai.com/learn
```

## Learning Center (public site)

Product tracks live at `https://www.motivefxai.com/learn` — stocks, crypto, options, prediction markets, sports betting, pink slips, plus AI investing and skills tracks.

## Checklist

- [ ] Privacy policy URL set in Play Console App content
- [ ] Data deletion URL set (Account deletion / Data safety)
- [ ] Website = `https://www.motivefxai.com`
- [ ] Short + full description pasted
- [ ] Social bios link to website with UTM if desired
- [ ] In-app auth links open Privacy, Terms, and Data deletion

See also: `docs/ANDROID_PLAY_STORE.md`
