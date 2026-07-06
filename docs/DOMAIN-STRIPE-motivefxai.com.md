# Stripe + domain setup — motivefxai.com

Production uses **one origin**: the React app and API share `https://motivefxai.com` (nginx proxies `/api/*` to FastAPI).

---

## Step 1 — DNS

At your registrar (Cloudflare, Namecheap, etc.):

| Type | Name | Value |
|------|------|--------|
| **A** | `@` (apex) | Your server IP |
| **CNAME** | `www` | `motivefxai.com` (optional) |

We redirect `www` → apex in `deploy/Caddyfile`.

---

## Step 2 — Server env

On the API container / `.env.production`:

```env
APP_PUBLIC_URL=https://motivefxai.com
CORS_ORIGINS=https://motivefxai.com,https://www.motivefxai.com
```

Restart the API after changing these. Checkout success/cancel URLs and the billing portal return URL are built from `APP_PUBLIC_URL` automatically.

Verify:

```bash
curl https://motivefxai.com/api/advisor/billing/plans
```

Look for:

```json
"appOrigin": "https://motivefxai.com",
"webhookUrl": "https://motivefxai.com/api/billing/webhook"
```

---

## Step 3 — Stripe products & prices

Create 5 subscription products (test mode first) — see [STRIPE-SETUP.md](./STRIPE-SETUP.md).

Add Price IDs to env:

```env
STRIPE_PRICE_LITE=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ULTRA=price_...
STRIPE_PRICE_ULTRA_PLUS=price_...
STRIPE_PRICE_ELITE=price_...
```

---

## Step 4 — Stripe webhook (production)

1. [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. **Endpoint URL:**

   ```
   https://motivefxai.com/api/billing/webhook
   ```

3. **Events:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET=whsec_...`

### Local dev (Stripe CLI)

```powershell
stripe listen --forward-to http://127.0.0.1:8001/api/billing/webhook
```

---

## Step 5 — Stripe Checkout redirect domains

In Stripe Dashboard → **Settings → Checkout settings** (or Branding / Customer portal):

- Add allowed redirect domain: **`motivefxai.com`**
- Customer portal return URL is handled by the app (`/?billing=1` on your domain)

Checkout redirects (server-generated):

| Flow | Success URL |
|------|-------------|
| Tier checkout | `https://motivefxai.com/?tier=pro` (etc.) |
| Cancel | `https://motivefxai.com/#pricing` |
| Billing portal return | `https://motivefxai.com/?billing=1` |

---

## Step 6 — Deploy stack + HTTPS

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai
copy .env.production.example .env.production
# Fill secrets, then:
docker compose -f docker-compose.staging.yml --env-file .env.production up -d --build
```

On the server, run Caddy with `deploy/Caddyfile` for automatic HTTPS on `motivefxai.com`.

---

## Step 7 — Smoke test

1. Open `https://motivefxai.com` — app loads, API calls go to `/api/...`
2. Sign in → Intelligence plans → Lite → pick 1 market → Stripe Checkout (test card `4242...`)
3. After payment → redirect to `https://motivefxai.com/?tier=lite`
4. Stripe webhook delivers → tier active in app
5. Account → Manage billing → returns to `https://motivefxai.com/?billing=1`

---

## Architecture

```
Browser → https://motivefxai.com
            ├── /              → React (nginx)
            ├── /api/*         → FastAPI :8001
            └── Stripe webhook → POST /api/billing/webhook
```

No separate `api.motivefxai.com` required unless you choose split hosting later.
