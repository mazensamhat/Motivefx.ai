# Play Appeal Submit Now

Use this file while the Google Play **Submit an appeal** form is open.

## Links

- Appeal doc: `docs/PLAY_SUSPENSION_APPEAL.md`
- Production AAB build: `https://expo.dev/accounts/msamhat/projects/motivefx/builds/52f83a92-def2-4b3b-bc7b-650ebfa3e480`
- Production AAB artifact: `https://expo.dev/artifacts/eas/QSF7vR-v6EUxsd2tRbB0LTUic3G8gReZV9emZJo1Z-8.aab`
- Phone-tested preview APK build: `https://expo.dev/accounts/msamhat/projects/motivefx/builds/8d9e54e0-bb4a-4c2b-a07d-3d4a8acd1592`
- Phone-tested preview APK artifact: `https://expo.dev/artifacts/eas/imJVCiVFQAaYWQuSOQbX0Ds9kfQ8735DKKcOqg6G_0c.apk`
- Account/data deletion URL: `https://www.motivefxai.com/data-deletion`

## Play Console form (1000 chars)

Paste this into **Describe the changes you will make to fix this issue if your appeal is granted.** Character count: **987**.

```text
We understand this suspension followed non-compliance and broken functionality: unresponsive sign-in, Android payment steering risk, and incomplete account deletion. We have already fixed these in MotiveFX.AI 1.0.6 (versionCode 22) and will upload/submit that AAB for review.

Shipped fixes: auth uses soft timeouts/retry instead of hard AbortController cancellation, so Sign in no longer shows canceled-fetch dead-end errors; Android native/WebView paths no longer open web pricing, Stripe checkout, or subscription management for digital goods. Play Billing is not claimed live, and purchase CTAs stay non-steering unless store billing is configured. We added POST /api/auth/delete-account plus in-app Delete account/Account paths; public deletion URL: https://www.motivefxai.com/data-deletion. We removed the forced native demo landmine, hardened shell modals/chrome/deep-scan paths, fixed scroll/touch behavior and header polish, and preserved monitor-only informational positioning.
```

## Mazen submits in Console

1. Confirm the form selection is **I understand what led to this issue and will fix it**.
2. Upload or attach the production AAB first if Play Console has not already accepted it.
3. Confirm Play Console shows **versionName 1.0.6** and **versionCode 22**.
4. Paste the 987-character text above into the 1000-character appeal field.
5. Add reviewer notes: demo email/password, no 2FA, age gate can use any 18+ birth year, terminal loads after sign-in, Account/Delete account is available, public deletion URL is `https://www.motivefxai.com/data-deletion`.
6. Attach or reference the AAB and APK artifact links if the form allows links.
7. Submit the appeal.
