# App Store IAP setup (MotiveFX)

Checklist for shipping StoreKit subscriptions via RevenueCat — same architecture as MotiveLife (WebView shell + native purchase bridge + server sync + webhook).

## Product IDs (create exactly)

**Subscription group:** `motivefx_intelligence`

| Tier | Apple Product ID | Period | Price |
|------|------------------|--------|-------|
| Lite | `ai.motivefx.app.lite.monthly` | monthly | $29.99 |
| Pro | `ai.motivefx.app.pro.monthly` | monthly | $59.99 |
| Ultra | `ai.motivefx.app.ultra.monthly` | monthly | $99.99 |
| Ultra+ | `ai.motivefx.app.ultra_plus.monthly` | monthly | $149.99 |
| Elite | `ai.motivefx.app.elite.yearly` | yearly | $999 |

## 1. App Store Connect

1. **Paid Apps Agreement** must be active (Agreements, Tax, and Banking).
2. Create subscription group **`motivefx_intelligence`**.
3. Create the five auto-renewable subscriptions with the **exact** product IDs above.
4. Fill localization, pricing, and review screenshot/notes for each product.
5. Products must exist in ASC **before** App Review (submit them with the binary).

## 2. RevenueCat

1. Create / open project → add iOS app with bundle id **`ai.motivefx.app`** (Android package same if shipping Play).
2. Link App Store Connect API key / shared secret.
3. Import / create products matching the five Apple product IDs.
4. Create **one entitlement per tier**, named exactly:
   - `lite`
   - `pro`
   - `ultra`
   - `ultra_plus`
   - `elite`
5. Attach each product to its entitlement.
6. Create a **default Offering** with packages that map to those products (monthly packages + yearly Elite).
7. Copy public SDK keys:
   - iOS: `appl_…` → `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
   - Android: `goog_…` → `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
8. Webhooks → URL:

   `https://www.motivefxai.com/api/webhooks/revenuecat`

   Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>`

## 3. Database

```bash
npx pnpm@9.15.0 --filter @motivefx/database exec prisma db push
```

Adds on `User`:

- `billingProvider` (`stripe` | `apple`)
- `appleOriginalTransactionId`
- `appleProductId`
- `revenueCatAppUserId`

SQL also in `packages/database/prisma/migrations/20260715_apple_iap/migration.sql`.

## 4. Vercel (site)

| Variable | Purpose |
|----------|---------|
| `REVENUECAT_WEBHOOK_SECRET` | Shared secret for RevenueCat webhook Bearer auth |

Redeploy after setting.

Confirm:

- `POST /api/subscription/apple` (session-authed activate after purchase)
- `POST /api/webhooks/revenuecat` (grant/revoke)

## 5. EAS secrets (mobile)

```bash
cd mobile
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_… --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value goog_… --scope project
```

`eas.json` production/preview already set `EXPO_PUBLIC_IAP_ENABLED=true`.  
Native IAP only activates when a RevenueCat API key is present **and** (if set) the flag is true. Without keys, the WebView keeps the Safari companion fallback.

## 6. Build & submit

```bash
cd mobile
npm install
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Ship **buildNumber 12+** (or whatever autoIncrement produces) with StoreKit + RevenueCat.

## 7. How it works

1. Web terminal detects native shell + `__MOTIVEFX_NATIVE_IAP__`.
2. Subscribe CTAs `postMessage({ type: "iap_purchase", tier, userId })`.
3. Expo shell runs `react-native-purchases` → StoreKit.
4. On success, WebView `POST /api/subscription/apple` with session cookie.
5. RevenueCat webhook keeps renewals/expirations in sync.
6. Stripe Checkout remains for **non-iOS / web** only — never inside the WebView.

## 8. Market defaults (IAP gap)

Lite/Pro market pickers are **not** shown inside native IAP yet.

Server defaults:

- Lite → `["stocks"]` (1 market)
- Pro → first 2 markets
- Ultra / Ultra+ / Elite → all 5

Users can change markets later via account/settings flows when those exist; Stripe web checkout still uses the market picker.

## 9. Review notes hint

> MotiveFX intelligence subscriptions are purchased via Apple In-App Purchase (StoreKit / RevenueCat) inside the iOS app. Web/Safari continues to use Stripe for non-App-Store customers. Sandbox: sign in, open Pricing, tap Subscribe with Apple.
