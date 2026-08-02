# Google Play Relaunch With New Listing

Use this only if the Google Play developer account remains in good standing and Google allows publishing a new compliant version with a **new package name** and **new app name**. Do not try to clone the suspended listing.

## Recommendation

Relaunch as a Play-safe, monitor-only intelligence product. Avoid a name, screenshots, CTAs, or first-run flow that makes the app look like a betting app, sportsbook companion, or real-money wagering tool.

The safest packaging is:

- Market/prediction intelligence only.
- No bet placement UI on Android.
- No sportsbook, odds-shopping, parlay, "place bet", "lock in", "cash out", "win", or similar CTAs.
- Betting/predictions desks hidden, renamed, or presented as news/intelligence watchlists unless Google Play gambling eligibility is confirmed.
- No external checkout steering for digital subscriptions.

## New App Identity

Do not reuse **MotiveFX.AI** as the app name. Suggested names that are not direct clones:

- Motive Signals
- Motive Market Intel
- Signal Desk by Motive
- Motive Monitor
- Market Pulse AI
- SignalWatch AI
- Motive Research Desk

Avoid names like "MotiveFX.AI 2", "MotiveFX Pro", or "MotiveFX Signals" if they read like the same suspended listing with a small suffix.

## High-Level Expo Rename Steps

In `mobile/app.json`:

- Change `expo.name` to the new Play-safe app name.
- Consider changing `expo.slug` if the EAS project should be distinct.
- Change `expo.scheme` if deep links should not reuse `motivefx`.
- Change `expo.android.package` from `ai.motivefx.app` to a new unique package, for example:
  - `ai.motive.signals`
  - `ai.motive.marketintel`
  - `com.motive.marketpulse`
- Bump `expo.version` for the new launch train.
- Reset or intentionally set `expo.android.versionCode` for the new package's first release train.
- Decide whether to create a new EAS project or keep the same EAS project with a new Android package. If creating a new EAS project, update `extra.eas.projectId` after `eas init` / project linking.

In `mobile/eas.json`:

- Keep `production.android.buildType` as `app-bundle`.
- Keep production URLs pointed at the compliant production web host.
- Disable or omit Android purchase paths unless Play Billing is fully configured and verified.
- Use separate EAS profiles only if you need a Play-safe Android flavor that hides betting/prediction surfaces while web/iOS keep broader features.

Before building:

- Run the normal Expo/EAS config validation.
- Confirm generated Android manifest/package uses the new package name.
- Confirm no release artifacts, screenshots, or review notes refer to the suspended package as the active app.

Do **not** run EAS builds or submissions until the Play-safe scope is finalized.

## Product Scope Checklist

- [ ] Android first launch includes an 18+ age gate if prediction, betting-adjacent, financial, or mature market content remains visible.
- [ ] App copy says "informational", "research", "signals", "market intelligence", or "monitoring"; it does not imply wagering execution or guaranteed outcomes.
- [ ] No bet placement, sportsbook account, deposit, withdrawal, odds-shopping, parlay builder, or "place bet" workflow is visible on Android.
- [ ] If betting/prediction desks remain, label them as analysis/monitoring and remove gambling-looking CTAs.
- [ ] Consider hiding betting desks entirely for Android until Google confirms policy fit.
- [ ] Financial disclaimers remain visible and accurate.
- [ ] Reviewer can access the core app without 2FA, invite codes, dead gates, or paid-only walls.

## Payments Checklist

- [ ] No buttons, links, modals, WebView bridges, auth copy, terminal copy, or error states open website pricing, Stripe checkout, or subscription management for Android digital subscriptions.
- [ ] If subscriptions are sold in-app, Google Play Billing is configured end-to-end before review.
- [ ] If Play Billing is not ready, Android may show entitlement status but must not steer users to web purchase.
- [ ] Website `/pricing` may exist for browser users, but the Android app must not direct users there for digital goods.
- [ ] Store listing does not say "subscribe on our website" or equivalent.

## Account And Data Checklist

- [ ] In-app account deletion is available from a clearly named Account/Delete account path.
- [ ] Public data deletion URL is live and matches Play Console.
- [ ] `POST /api/auth/delete-account` or the equivalent production endpoint is deployed and tested.
- [ ] Privacy Policy and Terms URLs are live, reachable without login, and match app behavior.
- [ ] Data Safety accurately declares account info, identifiers, app activity, diagnostics, and any financial/user-entered market data actually collected.
- [ ] No undeclared sensitive permissions are requested.

## Store Listing Checklist

- [ ] New app name and icon do not look like a direct clone of the suspended listing.
- [ ] Short description avoids betting, wagering, winning, sportsbook, guaranteed predictions, or purchase steering language.
- [ ] Full description emphasizes monitor-only market intelligence.
- [ ] Screenshots show login, watchlists/signals, alerts, and account deletion, not betting placement flows.
- [ ] Content rating answers account for financial content and any betting-adjacent references.
- [ ] Financial features declaration is completed if applicable.
- [ ] App category and tags do not imply gambling unless the app qualifies under Google Play's gambling policies for the target regions.
- [ ] Review notes include demo credentials, age-gate instruction, core smoke path, delete-account path, and a plain statement that Android does not sell digital subscriptions outside Play Billing.

## Reviewer Access Smoke Test

Run on a physical Android device before submission:

- [ ] Fresh install opens age gate and accepts an 18+ year.
- [ ] Register/sign in works without canceled-fetch or frozen-button errors.
- [ ] Terminal or native intelligence home loads within a reasonable time.
- [ ] Scroll, taps, back behavior, retry, and sign-out work.
- [ ] Account deletion path is visible and testable.
- [ ] Offline or failed network state shows retry/helpful copy.
- [ ] No Android path opens `/pricing`, Stripe, subscription management, or browser checkout.
- [ ] No Android path exposes bet-placement-looking UI unless policy eligibility is documented.

## Suggested Play-Safe Positioning

Use language like:

> Signal Desk by Motive provides AI-assisted market monitoring, watchlists, and research summaries for informational use. It does not place trades, place bets, operate wagering, or provide personalized financial advice.

Avoid language like:

> Beat the books, find winning bets, lock picks, place bets, guaranteed predictions, unlock premium picks on our website.

## Decision Gate

Proceed with a new listing only after:

- [ ] Play Console Policy status has been checked and any active account-level issue is understood.
- [ ] The Android package and app name are new.
- [ ] Betting/predictions surfaces are removed, hidden, or made clearly monitor-only.
- [ ] Payment steering is eliminated or Play Billing is live.
- [ ] Data Safety, content rating, account deletion, reviewer notes, screenshots, and the binary match each other.
