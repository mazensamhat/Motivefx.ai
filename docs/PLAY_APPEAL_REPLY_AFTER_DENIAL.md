# Google Play Appeal Reply After Denial

## SEND THIS EMAIL NOW

Reply to: `googleplay-developer-support@google.com`

Subject: `Request for clarification and reconsideration - MotiveFX.AI (ai.motivefx.app)`

Body: copy everything under **Paste-Ready Reply Email** below, starting with `Dear Google Play Review Team,` and ending with `MotiveFX.AI / MotiveFX team`.

Use this if replying to the Google Play denial email after the appeal was denied under **Enforcement Process / repeated violations**. Keep the tone factual. Do not claim Google Play Billing is live unless it is actually configured, reviewed, and verified.

## Current Verdict

Reinstatement of the same listing (`ai.motivefx.app`, MotiveFX.AI) should be treated as effectively closed unless Google identifies a specific review mistake or a specific remaining Policy status item that can still be corrected under the suspended listing.

The practical paths are:

1. Reply once for clarity and reconsideration of the remediated build.
2. If the developer account remains in good standing, prepare a new compliant listing with a new package name and new app name.

## What We Claimed In The Appeal

The prior appeal in `docs/PLAY_SUSPENSION_APPEAL.md` claimed that build **1.0.6 / versionCode 22** remediated the known review themes:

- Broken functionality: sign-in timeout/cancel behavior, WebView loader/retry behavior, scrolling/touch handling, and reviewer paths that could look frozen.
- Payment policy risk: Android app paths no longer open web pricing, Stripe checkout, or subscription management for digital subscriptions; purchase CTAs remain non-steering unless Play Billing is configured.
- Account deletion: public deletion URL plus `POST /api/auth/delete-account` and in-app deletion/account entry points.
- Process controls: a pre-submit Play checklist, physical-device smoke testing, payment steering gate, and version discipline.
- Product positioning: monitor-only predictive market intelligence, not brokerage, sportsbook, personalized financial advice, or live Play Billing.

## What Google Typically Needs For Repeated Violations

For repeated violations, Google usually needs more than "we fixed the latest build." Review teams look for:

- The exact active Policy status issues in Play Console being resolved, not only guessed from prior emails.
- Evidence that the same policy class will not recur across future submissions.
- A clean app binary, store listing, Data Safety form, content rating, reviewer credentials, account deletion flow, and in-app behavior that all tell the same story.
- No residual external purchase steering for digital goods from Android.
- No gambling or real-money gaming impression unless the app qualifies under Google Play gambling policies for the target regions.
- No broken login, gated content, dead CTAs, inaccessible reviewer paths, or unverifiable account deletion path.

MotiveFX has betting/predictions desks and related copy. Even when intended as market intelligence, those surfaces can trigger gambling policy scrutiny on Play if they look like bet placement, betting facilitation, or real-money wagering promotion.

## Paste-Ready Reply Email

Subject: Request for clarification and reconsideration - MotiveFX.AI (`ai.motivefx.app`)

Dear Google Play Review Team,

Thank you for reviewing our appeal for MotiveFX.AI (`ai.motivefx.app`). We understand the appeal was denied under the Enforcement Process because the app was considered to have repeatedly violated Google Play policy. We take that seriously and do not want to resubmit or publish anything that remains non-compliant.

We are requesting one final clarification and, if appropriate, reconsideration of the remediated build **1.0.6 / versionCode 22**. Our intent is not to dispute the importance of enforcement. We are trying to identify whether there is still a specific unresolved Policy status item, or whether the suspension is now final based on the repeated-violation history.

In the remediated build and supporting web deployment, we addressed the issues we understood from prior review feedback and our own audit:

- Broken functionality: sign-in now uses soft timeouts/retry instead of hard `AbortController` cancellation that surfaced as a canceled-fetch dead end; loading, retry, scroll, touch, and terminal WebView paths were hardened.
- Android payments: Android native/WebView paths no longer open web pricing, Stripe checkout, or subscription management for digital subscriptions. We are not claiming Play Billing is live; purchase CTAs remain non-steering unless store billing is configured.
- Account deletion: we added `POST /api/auth/delete-account`, in-app Delete account / Account paths, and the public deletion page at `https://www.motivefxai.com/data-deletion`.
- Reviewer paths: the native demo/legacy-route risks were removed or hardened so reviewers land in the intended monitor-only terminal experience.
- Product scope: MotiveFX.AI is informational market-intelligence software. It is not a broker, sportsbook, gambling operator, or source of personalized financial advice.

We also recognize that MotiveFX includes betting/predictions-related intelligence surfaces, which may create gambling-policy concerns if they appear to facilitate wagering. If that is the remaining concern, please identify the relevant Policy status item or category so we can remove, hide, or repackage those surfaces appropriately for Google Play.

Could you please confirm one of the following?

1. Which specific Policy status item(s), app screen(s), store-listing text, Data Safety answer, content-rating answer, or reviewer flow still failed after the 1.0.6 / versionCode 22 remediation; or
2. Whether the same listing/package is no longer eligible for reinstatement because of the repeated-violation history, even if the current build has remediations.

If the denial was based on a review of an older binary, stale store listing content, or a reviewer path that did not reach versionCode 22, we respectfully request reconsideration of versionCode 22. If reinstatement is not available, we will use your clarification to avoid repeating the same issue in any new compliant app listing.

Thank you,

MotiveFX.AI / MotiveFX team

## Notes Before Sending

- Check Play Console **Policy status** first and mention any exact active issue names in the reply.
- Do not add claims that are not true in production.
- Do not say the app has Play Billing unless RevenueCat Android key, Play products, purchase flow, and entitlement sync are verified.
- If Google names gambling policy as the concern, treat the current package/listing as high-risk and move to the relaunch checklist.
