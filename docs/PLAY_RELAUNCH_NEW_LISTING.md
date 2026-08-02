# Google Play Relaunch With New Listing

Use this only if the Google Play developer account remains in good standing and Google allows publishing a new compliant version with a **new package name** and the locked app name **MotiveFX**. Do not try to clone the suspended listing/package.

## Recommendation

Relaunch as a Play-safe, monitor-only intelligence product. Avoid a name, screenshots, CTAs, or first-run flow that makes the app look like a betting app, sportsbook companion, or real-money wagering tool.

The safest packaging is:

- Market/prediction intelligence only.
- No bet placement UI on Android.
- No sportsbook, odds-shopping, parlay, "place bet", "lock in", "cash out", "win", or similar CTAs.
- Betting/predictions desks hidden, renamed, or presented as news/intelligence watchlists unless Google Play gambling eligibility is confirmed.
- No external checkout steering for digital subscriptions.

## New App Identity

Locked identity for this relaunch:

- Google Play store/app display name: **MotiveFX**
- Android package/applicationId: **`com.motivefx.app`**
- Expo slug: **`motivefx-android`**
- Android release train: **1.0.0 / versionCode 1**

Do not reuse the suspended package **`ai.motivefx.app`**. Do not use **MotiveFX.AI** as the new Play listing name.

## High-Level Expo Rename Steps

In `mobile/app.json`:

- `expo.name` is **MotiveFX**.
- `expo.slug` is **`motivefx-android`** so the EAS project can be separated from the prior listing if needed.
- `expo.scheme` remains **`motivefx`** for brand deep links.
- `expo.android.package` is **`com.motivefx.app`**.
- `expo.version` is **1.0.0**.
- `expo.android.versionCode` is **1** for the new package's first release train.
- Current `extra.eas.projectId` may still point at the previous Expo project. If Expo refuses to build or links artifacts to the prior app, run `eas init` from `mobile/`, create/link a new Expo project for MotiveFX, then commit the new `extra.eas.projectId`.

In `mobile/eas.json`:

- Keep `production.android.buildType` as `app-bundle`.
- Keep production URLs pointed at the compliant production web host.
- Disable or omit Android purchase paths unless Play Billing is fully configured and verified.
- Android native WebView now runs in Play-safe monitor mode: sports/event-market desks remain informational, but sportsbook/prediction-market app handoffs and bet/position entry ledgers are hidden or disabled.

Before building:

- Run the normal Expo/EAS config validation.
- Confirm generated Android manifest/package uses the new package name.
- Confirm no release artifacts, screenshots, or review notes refer to the suspended package as the active app.

Do **not** run EAS builds or submissions until the Play-safe scope is finalized.

## Product Scope Checklist

- [ ] Android first launch includes an 18+ age gate if prediction, betting-adjacent, financial, or mature market content remains visible.
- [ ] App copy says "informational", "research", "signals", "market intelligence", or "monitoring"; it does not imply wagering execution or guaranteed outcomes.
- [x] No bet placement, sportsbook account, deposit, withdrawal, odds-shopping, parlay builder, or "place bet" workflow is visible on Android native.
- [x] Betting/prediction desks remain as odds/event intel monitors with gambling-looking CTAs removed on Android native.
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

- [x] New package is `com.motivefx.app`; app name is MotiveFX, not MotiveFX.AI.
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
- [x] The Android package is new and the app name is locked to MotiveFX.
- [x] Betting/predictions surfaces are hidden where they look like entry/placement workflows, or made clearly monitor-only on Android native.
- [ ] Payment steering is eliminated or Play Billing is live.
- [ ] Data Safety, content rating, account deletion, reviewer notes, screenshots, and the binary match each other.
