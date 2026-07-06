# Stripe setup — intelligence tier pricing

Follow these steps in order. Use **Test mode** until checkout and webhooks work end-to-end.

---

## Step 1 — Stripe account & API keys

1. Open [Stripe Dashboard](https://dashboard.stripe.com) → **Developers → API keys**.
2. Copy **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY` in `.env` (repo root or `backend/.env`).
3. Keep test mode ON while developing.

---

## Step 2 — Create products & prices

In **Product catalog → Add product**, create **five subscription products**:

| Product name | Billing | Price | Env variable |
|---|---|---|---|
| MotiveFX Lite | Monthly recurring | **$29.99** | `STRIPE_PRICE_LITE` |
| MotiveFX Pro | Monthly recurring | **$59.99** | `STRIPE_PRICE_PRO` |
| MotiveFX Ultra | Monthly recurring | **$99.99** | `STRIPE_PRICE_ULTRA` |
| MotiveFX Ultra+ | Monthly recurring | **$149.99** | `STRIPE_PRICE_ULTRA_PLUS` |
| MotiveFX Elite | **Yearly** recurring | **$999.00** | `STRIPE_PRICE_ELITE` |

For each product:

1. Add product → set name.
2. Add price → amount → recurring interval (month or **year** for Elite).
3. After saving, open the price and copy the **Price ID** (`price_...`) into `.env`.

Example `.env` block:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LITE=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ULTRA=price_...
STRIPE_PRICE_ULTRA_PLUS=price_...
STRIPE_PRICE_ELITE=price_...
```

> **Demo mode:** If Stripe keys or price IDs are missing, checkout runs in demo mode and activates the tier locally (good for UI testing without Stripe).

---

## Step 3 — Customer billing portal (downgrades & payment method)

1. **Settings → Billing → Customer portal**.
2. Enable: cancel subscriptions, switch plans (optional), update payment methods.
3. Save — the app already calls `/advisor/billing/portal` from Account settings.

---

## Step 4 — Webhook endpoint

### Local development (Stripe CLI)

```powershell
stripe login
stripe listen --forward-to http://127.0.0.1:8001/api/billing/webhook
```

Copy the webhook signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.

### Production

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://motivefxai.com/api/billing/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy signing secret → production env.

---

## Step 5 — Run the stack

```powershell
# Terminal 1 — API
cd backend
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8001

# Terminal 2 — Web (optional Stripe CLI in Terminal 3)
cd web
npm run dev
```

Verify config:

```powershell
curl http://127.0.0.1:8001/advisor/billing/plans
```

Look for `"stripeConfigured": true` and each tier `"stripePriceConfigured": true`.

---

## Step 6 — Test checkout flows

### A. Demo mode (no Stripe)

1. Sign in at `http://127.0.0.1:5280`.
2. Scroll to **Intelligence plans**.
3. Choose **Lite** → pick **one** market → confirm.
4. Plan should activate immediately; sidebar locks markets you did not pick.

### B. Stripe test mode

1. Complete Step 2 env vars + Step 4 webhook.
2. Choose **Pro** → pick **two** markets → Stripe Checkout opens.
3. Use test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. After redirect, confirm `/advisor/modules/{user_id}` shows `"tier": "pro"` and two `allowedMarkets`.

### C. Downgrade / cancel

1. **Account → Manage billing** (Stripe portal).
2. Cancel subscription.
3. Webhook fires → tier reconciles to Lite with no markets (or remaining subs).
4. Refresh app — Pro/Ultra features should disappear.

---

## How metadata flows

Checkout sends Stripe metadata:

- `user_id` — MotiveFX user
- `tier` — `lite` | `pro` | `ultra` | `ultra_plus` | `elite`
- `selected_markets` — comma-separated module keys (`trades,crypto`, etc.)
- `module` — same as tier (for subscription row lookup)

Webhook `checkout.session.completed` calls `activate_tier_plan()` which:

1. Sets active module subscriptions to match tier + market picks.
2. Writes `user_intelligence_plans`.
3. Enforces entitlements on next API call.

---

## Legacy module prices (optional)

Old per-module checkout (`STRIPE_PRICE_TRADES`, bundle, annual) still works for existing customers. New UI uses tier checkout only.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Checkout redirects but plan unchanged | Webhook not reaching API — check CLI listen or production URL |
| `demoMode: true` always | Missing `STRIPE_SECRET_KEY` or price ID for that tier |
| Lite user sees all markets | Hard refresh; check `allowedMarkets` in modules API |
| Portal “no billing account” | Complete at least one Stripe checkout (creates customer) |
