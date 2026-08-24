# MotiveFX — Google Play store listing fields (new listing)

Use for the **new** app only: display name **MotiveFX**, package **`com.motivefx.app`**.  
Do not paste this into the suspended MotiveFX.AI / `ai.motivefx.app` listing.

Master steps: [`PLAY_RELAUNCH_NEW_LISTING.md`](./PLAY_RELAUNCH_NEW_LISTING.md) · Plain list: [`play-relaunch/CHECKLIST.txt`](./play-relaunch/CHECKLIST.txt)

## Required disclosure URLs

| Field | URL |
|-------|-----|
| **Privacy policy** | `https://www.motivefxai.com/privacy` |
| **Account / data deletion** | `https://www.motivefxai.com/data-deletion` |
| **Terms of Service** | `https://www.motivefxai.com/terms` |
| **Marketing / website** | `https://www.motivefxai.com` |
| **Support** | `https://www.motivefxai.com` or `mailto:support@motivefx.ai` |

Do **not** put the public `/pricing` page in Play listing text as a purchase path for the Android app.

## Billing (critical)

- This Android build does **not** sell digital subscriptions (`EXPO_PUBLIC_IAP_ENABLED=false`).
- The app must **not** steer users to website checkout for digital goods.
- Store listing must **not** say “subscribe on our website.”
- Re-enable Play Billing only after RevenueCat Android + Play products + entitlement sync are verified.

## Social profiles

| Platform | URL |
|----------|-----|
| **Instagram** | `https://www.instagram.com/motivefx.ai/` |
| **Facebook** | `https://www.facebook.com/profile.php?id=61591532050605` |
| **LinkedIn** | `https://www.linkedin.com/company/motivefx-ai/` |

## Short description (≤80 chars)

```
AI market intelligence for stocks, crypto, options & events. Monitor only.
```

(74 chars; Play limit ≤80.)

## Full description (draft)

```
MotiveFX is an AI market intelligence terminal for informational research.

Monitor stocks, crypto, options flow, and event-market context in one place. Motive Signal™ scores help you prioritize what to research next. Plain-English briefs explain why a move matters.

What MotiveFX is:
• Research and analytics software
• Educational market intelligence
• Informational only — not personalized financial advice

What MotiveFX is NOT:
• A broker or exchange
• A sportsbook or gambling operator
• A place to place bets or trades
• Personalized financial, investment, or wagering advice

Privacy: https://www.motivefxai.com/privacy
Delete your data: https://www.motivefxai.com/data-deletion
Terms: https://www.motivefxai.com/terms
```

## Screenshots guidance

Show: age gate / sign-in, Home signals, stocks/crypto monitors, Account → Delete account.  
Avoid: bet slips, “place bet”, sportsbook logos as CTAs, Polymarket handoff buttons, “lock in” / “cash out” language.

## Checklist

- [ ] Privacy policy URL in App content
- [ ] Data deletion URL set
- [ ] Website = `https://www.motivefxai.com`
- [ ] Short + full description (no website purchase steering)
- [ ] Screenshots are Play-safe / monitor-only
- [ ] In-app Delete account works
- [ ] Reviewer credentials in review notes (no 2FA)
