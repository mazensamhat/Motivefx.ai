# App Store — Guideline 2.1 Information Needed

**App:** MotiveFX.AI (`ai.motivefx.app`)  
**Binary context:** Version **1.0.0** (build **19** era) — free informational reader  
**Desktop paste file:** `C:/Users/Mazen/Desktop/APP_STORE_REVIEW_INFORMATION.txt`  
**Related:** [`APP_STORE_REJECTION_FIX.md`](./APP_STORE_REJECTION_FIX.md), [`APP_STORE_REVIEW_RESPONSE.md`](./APP_STORE_REVIEW_RESPONSE.md)

Privacy: https://www.motivefxai.com/privacy  
Data deletion: https://www.motivefxai.com/data-deletion

Use this package when Apple sends **Guideline 2.1 — Information Needed** requesting the seven review-information items. Keep the same answers in **App Review Information → Notes** for future submissions.

---

## Reply to App Review (paste first)

```
Hello App Review Team,

Thank you for the Guideline 2.1 Information Needed request. We have attached (or are attaching) a physical-device screen recording that begins with a cold launch and walks through the core user flow. Numbered answers to your seven requests follow below and are also entered in App Review Information → Notes for future submissions.

Please review build 1.0.0 (19) (or the binary currently selected for this submission). The iOS app is a free informational reader: guest browse after an 18+ age gate; optional sign-in; monitor-only market / odds / prediction intel; no in-app purchases and no ability to place bets or wagers.

Thank you,
MotiveFX.AI team
```

---

## Item 1 — Screen recording (physical device only)

**We cannot create this video for you.** Record on a real iPhone or iPad on a recent iOS, then attach it in App Store Connect.

### Recording checklist

**Before you start**

- [ ] Install the review binary (TestFlight or the submitted build) on a physical iPhone or iPad
- [ ] Use a fresh install or clear app data so age gate appears on cold launch
- [ ] Confirm Wi‑Fi works and www.motivefxai.com / terminal loads
- [ ] Confirm demo login works BEFORE recording: `impactmedia313@gmail.com` / `test1234`  
      (If login fails, reset the password or create a fresh demo account with no 2FA, then update Notes)
- [ ] Screen Recording enabled (Control Center → Screen Recording)
- [ ] Record in portrait; keep UI readable

**Script (≈ 2–4 minutes)**

1. Cold launch — open MotiveFX.AI from the home screen
2. Age gate (18+) — enter a birth year that makes the user 18+; accept / continue
3. Guest Home / signals — land on Home / terminal as guest; scroll briefly
4. **Bets** (monitor-only) — show odds / line intel; no place-bet CTA
5. **Predictions** — show Polymarket-style event intel only
6. Optional Account / sign-in — sign in with the demo account (no 2FA)
7. **Delete account** path — Account → Delete account (show UI; cancel or recreate demo after if you delete)
8. No purchase flows — state N/A (no IAP / subscription purchase in this iOS binary)
9. Stop recording

**N/A for this app:** no UGC reporting/blocking; no ATT / location / camera / contacts prompts.

### Where to attach in App Store Connect

1. App Store Connect → My Apps → **MotiveFX.AI**
2. Open the version under review or the Resolution Center message
3. Attach the recording to your **Reply** to App Review
4. Paste Items 2–7 into **App Review Information → Notes** for future submissions

---

## Items 2–7 — Paste into Notes / Reply

### 2. Devices and OS tested

```
We tested MotiveFX.AI on physical devices via development installs and TestFlight before submission, including:

• iPhone 15 / iPhone 16 class devices (physical) — iOS 17.x and iOS 18.x
• iPad Air 11-inch (physical; previously referenced in App Review notes) — iPadOS 17.x / 18.x

We also smoke-tested the same free-reader flows on recent iOS simulators during development, but primary verification for App Review is on physical hardware. The app supports iPhone and iPad (tablet supported).
```

### 3. App functions and target audience

```
MotiveFX.AI (MotiveFX) is an AI-assisted market intelligence reader for adults 18+. It helps users research equities, crypto, options-related intel, sports odds context, and prediction-market events in one place.

Problem it solves: retail researchers and news-driven investors struggle to scan fast-moving market, odds, and prediction signals across multiple sites. MotiveFX consolidates monitor-only desks (Home/signals, Trades, Crypto, Bets odds intel, Predictions, Pink Slips) with plain-language briefs.

Value: informational research context and signal monitoring — not a broker, not a sportsbook, and not personalized investment advice. Users cannot place trades, bets, or wagers inside the iOS app. Signing in is optional; guest mode after the 18+ age gate unlocks the same free informational reader experience on iOS.

Target audience: adults 18+ interested in market and event intelligence. Gambling-related content (sports odds / prediction intel) is disclosed in Age Rating (Gambling = Yes); the app remains monitor-only.
```

### 4. Setup instructions and credentials

```
Setup / review path:

1. Install the submitted binary (fresh install preferred).
2. Launch the app. Complete the birth-year age gate confirming 18+.
3. After the gate, the app opens the Home / terminal experience in guest mode. No account is required to browse market insights.
4. Use the bottom navigation to open core desks: Home/signals, Trades, Crypto, Bets (odds intel — monitor only), Predictions (event intel — monitor only), Pink Slips.
5. Optional: tap Sign in and use the demo account below. Account creation is available but not required.
6. When signed in: Account → Delete account (password confirmation). Public web deletion: https://www.motivefxai.com/data-deletion
7. There are no in-app purchases, no StoreKit products, and no subscription purchase CTAs in this iOS binary. Web subscriptions do not unlock exclusive paid digital content on iOS in this free-reader build.

Demo account for App Review (no 2FA):
Email: impactmedia313@gmail.com
Password: test1234

Privacy Policy: https://www.motivefxai.com/privacy
```

**Developer note:** Confirm `impactmedia313@gmail.com` / `test1234` still works before reply. Repo docs do not store alternate credentials; if login fails, reset or create a new no-2FA demo account and update Notes.

### 5. External services

```
The iOS app is a native shell that loads MotiveFX’s authenticated / guest terminal experience and calls our backend APIs. Core external dependencies include:

• MotiveFX web / terminal (https://www.motivefxai.com) — primary product UI hosted in the app WebView / handoff
• MotiveFX auth & account APIs (register, login, session, delete-account) on motivefxai.com
• Market data: Finnhub (equities / related intel); CoinStats / CoinGecko (crypto)
• Sports odds: SharpAPI (primary when configured); The Odds API (backup / optional)
• Prediction markets: Polymarket Gamma API (public event/price intel)
• Optional enrichment: Bitquery (on-chain Polymarket sports rows when configured)
• AI briefs / Ask Motive: OpenAI (when configured)
• Hosting / infra: cloud hosting for the site and APIs (e.g. Vercel), email delivery for account flows
• Stripe exists for web billing only — not used for purchases inside this iOS free-reader binary (no IAP)

The app does not require reviewers to configure API keys. Live or labeled demo data is served by our backend.
```

### 6. Regional differences

```
The app functions consistently across regions for the informational content described above. There are no intentional regional feature splits, geo-locked desks, or country-specific purchase flows in the iOS free-reader binary. Market and odds panels show the same monitor-only intel worldwide, subject only to normal upstream data availability from third-party feeds (which may occasionally be sparse for some sports/events). We do not claim region-specific gambling-operator licenses because users cannot place bets in the app.
```

### 7. Regulated industry / protected material

```
MotiveFX.AI provides informational market and event intelligence only. It is not a licensed broker-dealer, investment adviser, casino, sportsbook, or gambling operator, and the iOS app does not execute trades or accept wagers.

Sports odds and prediction-market panels are monitor-only research views of publicly available market/odds data (including Polymarket Gamma and odds providers). Age Rating correctly marks Gambling-related content because the app displays odds/prediction intel related to real-money gambling topics; that does not mean the app is a wagering venue.

We do not claim that a gambling-operator or brokerage license is required for this monitor-only informational reader. We do not redistribute protected third-party material beyond ordinary licensed/API market data use under our provider terms. No additional regulatory credentials are attached because none are required for this free informational product as submitted.
```

---

## Mazen checklist

- [ ] Verify demo password still works (or replace credentials in Notes)
- [ ] Record physical-device video using the script above
- [ ] Attach video to Resolution Center Reply
- [ ] Paste Reply + Items 2–7 into Notes
- [ ] Confirm Gambling = Yes and free-reader build **19** is selected
- [ ] Submit / reply in App Store Connect
