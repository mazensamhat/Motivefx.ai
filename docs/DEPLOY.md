# Deploy MotiveFX to Production (same path as Motive Life)

**Stack:** GitHub → Vercel → Supabase → Stripe (live)  
**Domain:** `https://motivefxai.com`  
**Vercel root:** `apps/site`  
**Landing page:** locked — deploy `apps/site` as-is.

Estimated time: ~45 minutes.

---

## Launch order (do in this sequence)

| Step | What | Where |
|------|------|--------|
| **1** | Create Supabase project + push schema | [supabase.com](https://supabase.com) |
| **2** | Push code to GitHub | New repo `motivefx-ai` |
| **3** | Import repo in Vercel (root `apps/site`) | [vercel.com](https://vercel.com) |
| **4** | Stripe products + webhook (test mode first, then live) | [dashboard.stripe.com](https://dashboard.stripe.com) |
| **5** | Add `motivefxai.com` in Vercel Domains | Your registrar DNS |
| **6** | Smoke test checkout + webhook | See §6 below |

**Tip:** Deploy once with Stripe **test** keys on Vercel Preview, verify checkout, then switch Production to **live** keys.

---
## Why this path (not Docker)

| Motive Life | MotiveFX (this deploy) |
|-------------|-------------------------|
| Next.js on Vercel | Next.js on Vercel (`apps/site`) |
| Postgres on Supabase | Postgres on Supabase |
| Stripe webhooks as API routes | Same: `/api/webhooks/stripe` |
| One Vercel project per product | **New** Vercel project; same Vercel **account** as Motive Life is fine |

The existing **`web/`** (Vite) + **`backend/`** (FastAPI + SQLite) stack stays for local dev and will be ported into Next.js over time. Production billing and the public site go through **`apps/site`** first — same pattern you already used for Motive Life.

---

## 1. Supabase (database)

1. Create a **new** project at [supabase.com](https://supabase.com) (separate from Motive Life).
2. **Settings → Database → Connection string**
3. Copy **URI** (Transaction pooler, port **6543**) → `DATABASE_URL`
4. Copy **Direct connection** (port **5432**) → `DIRECT_URL`

Create `packages/database/.env`:

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"
```

Push schema (once):

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai
npx pnpm@9.15.0 install
npx pnpm@9.15.0 db:generate
npx pnpm@9.15.0 db:push
```

---

## 2. GitHub

1. Create repo `motivefx-ai` (private recommended)
2. Push this project:

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai
git init
git add .
git commit -m "MotiveFX Vercel site + tier billing"
git branch -M main
git remote add origin https://github.com/YOUR_USER/motivefx-ai.git
git push -u origin main
```

---

## 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import the `motivefx-ai` repo  
   (same account you use for Motive Life)
2. **Root Directory:** `apps/site`
3. **Framework:** Next.js (auto-detected)
4. **Environment variables** (Production):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase pooled URL (6543) |
| `DIRECT_URL` | Supabase direct URL (5432) |
| `NEXT_PUBLIC_APP_URL` | `https://motivefxai.com` (or `https://motivefx-ai.vercel.app` until DNS is ready) |
| `STRIPE_SECRET_KEY` | **Live** key `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From step 4 below |
| `STRIPE_PRICE_LITE` | Live price `price_...` — Lite $29.99/mo |
| `STRIPE_PRICE_PRO` | Live price — Pro $59.99/mo |
| `STRIPE_PRICE_ULTRA` | Live price — Ultra $99.99/mo |
| `STRIPE_PRICE_ULTRA_PLUS` | Live price — Ultra+ $149.99/mo |
| `STRIPE_PRICE_ELITE` | Live price — Elite $999/yr (annual price in Stripe) |
| `AUTH_SECRET` | Random 32+ char string for session cookies |
| `MOTIVEFX_API_URL` | FastAPI URL (local: `http://127.0.0.1:8001`; prod: Render URL) |
| `BACKEND_SYNC_SECRET` | Same value on Vercel **and** FastAPI backend |
| `RESEND_API_KEY` | Same `re_...` as Motive Life (shared account) |
| `EMAIL_FROM` | `MotiveFX <hello@mymotivelife.com>` |

See **[docs/RESEND-SETUP.md](../RESEND-SETUP.md)** — no new Resend domain required.

5. **Deploy**

After first deploy, set `NEXT_PUBLIC_APP_URL` to the final URL and redeploy if you used a placeholder.

---

## 4. Stripe (live)

1. Stripe Dashboard → turn **Test mode OFF**
2. **Product catalog** → create five products/prices (or one product with five prices):

   | Plan | Price |
   |------|-------|
   | Lite | $29.99/mo |
   | Pro | $59.99/mo |
   | Ultra | $99.99/mo |
   | Ultra+ | $149.99/mo |
   | Elite | $999/yr |

3. Copy each **live** `price_...` into the matching Vercel env var above.
4. **Developers → API keys** → copy **live** secret → `STRIPE_SECRET_KEY`
5. **Developers → Webhooks → Add endpoint**
   - URL: `https://motivefxai.com/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET` in Vercel
6. **Settings → Billing → Customer portal** → enable (for “Manage billing”)
7. Redeploy Vercel after adding webhook secret

---

## 5. Custom domain (`motivefxai.com`)

1. Vercel project → **Domains** → add `motivefxai.com` and `www.motivefxai.com` (pick one as primary)
2. DNS at your registrar:
   - `www` → CNAME `cname.vercel-dns.com`
   - apex `@` → A `76.76.21.21` (or CNAME flatten if your registrar supports it)
3. Set `NEXT_PUBLIC_APP_URL` to `https://motivefxai.com` and redeploy
4. Update Stripe webhook URL to the same domain

---

## 6. Smoke test (production)

- [ ] `https://motivefxai.com` loads
- [ ] `/pricing` shows Lite / Pro / Ultra / Ultra+ / Elite
- [ ] Enter email → Lite → pick 1 market → Stripe Checkout opens
- [ ] After payment, webhook fires (check Vercel logs for `/api/webhooks/stripe`)
- [ ] User row in Supabase has `intelligenceTier` and `selectedMarkets` set
- [ ] Billing portal: `POST /api/billing/portal` with `{ "email": "..." }` returns Stripe portal URL

---

## 7. FastAPI backend (intelligence tools)

The Next.js site proxies market APIs to FastAPI and syncs users via an internal bridge.

### Local (two terminals)

```powershell
# Terminal 1 — FastAPI
cd C:\Users\Mazen\Documents\motivefx-ai\backend
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8001

# Terminal 2 — Next.js site
cd C:\Users\Mazen\Documents\motivefx-ai
npx pnpm@9.15.0 dev
```

Set in `apps/site/.env.local` and `backend/.env`:

```env
MOTIVEFX_API_URL=http://127.0.0.1:8001
BACKEND_SYNC_SECRET=your-shared-secret
```

### Production (Render)

See **[docs/FASTAPI-RENDER.md](../FASTAPI-RENDER.md)** for the full guide.

**Blueprint:** https://dashboard.render.com/blueprint/new?repo=https://github.com/mazensamhat/Motivefx.ai

1. Run `.\scripts\generate-production-secrets.ps1` for `JWT_SECRET_KEY` + `BACKEND_SYNC_SECRET`
2. Apply Blueprint → set secrets when prompted
3. Copy Render URL → Vercel `MOTIVEFX_API_URL`
4. Set same `BACKEND_SYNC_SECRET` on Vercel → redeploy

Health check: `GET https://www.motivefxai.com/api/system/health` should show `backend: true` when both are up.

**Billing stays on Vercel** — do not rely on FastAPI `/api/billing/webhook` in production.

---

## 8. What comes next (dashboard)

Phase 2: move the full Vite dashboard from `web/` into `apps/site`. The Python `backend/` powers live feeds until those APIs are fully ported.

For local dev of the **legacy** Vite dashboard (unchanged):

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai\web
npm run dev

cd C:\Users\Mazen\Documents\motivefx-ai\backend
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8001
```

For local dev of the **Vercel site**:

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai
npx pnpm@9.15.0 install
# Copy Supabase URLs to packages/database/.env and apps/site/.env.local
npx pnpm@9.15.0 dev
```

Open `http://localhost:3010`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on Vercel | Root Directory must be `apps/site`; check build logs |
| Database errors | Run `db:push` with Supabase `DIRECT_URL`; verify pooled URL on Vercel |
| Stripe checkout fails | Live keys + live price IDs from the same Stripe account |
| Tier not active after pay | Webhook secret + endpoint URL; check Vercel function logs |
| Wrong tier price env | Ultra+ uses `STRIPE_PRICE_ULTRA_PLUS` (underscore) |

---

## Local env template

`apps/site/.env.local`:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3010"
AUTH_SECRET="..."
MOTIVEFX_API_URL="http://127.0.0.1:8001"
BACKEND_SYNC_SECRET="..."
RESEND_API_KEY="re_..."   # same as Motive Life
EMAIL_FROM="MotiveFX <hello@mymotivelife.com>"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_LITE="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_ULTRA="price_..."
STRIPE_PRICE_ULTRA_PLUS="price_..."
STRIPE_PRICE_ELITE="price_..."
```

Use Stripe **test** keys locally; use **live** keys only on Vercel Production.

