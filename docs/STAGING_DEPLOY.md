# MotiveFX.AI — Staging deployment guide

Deploy a beta-ready stack: **nginx** (React app + `/api` + `/go` proxy) + **FastAPI** (SQLite on a persistent volume).

---

## Quick start (Docker on your machine)

**Requirements:** Docker Desktop, Node 22+ (optional if using Docker only)

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai

# 1. Create staging env
copy .env.staging.example .env.staging
.\scripts\generate-secrets.ps1
# Paste JWT_SECRET_KEY and ADMIN_API_KEY into .env.staging
# Set APP_PUBLIC_URL=http://localhost:8080 and matching CORS_ORIGINS

# 2. Start stack
.\scripts\staging-up.ps1
```

Open **http://localhost:8080** — same as production routing (single origin, no CORS issues).

Stop:

```powershell
docker compose -f docker-compose.staging.yml down
```

---

## Architecture

```
Browser → nginx:80 (Dockerfile.web)
            ├── /          → React static (web/dist)
            ├── /api/*     → proxy → api:8001
            └── /go/*      → proxy → api:8001 (short links)

api:8001 (Dockerfile)
  └── SQLite at /app/backend/data/motivefx.db (Docker volume)
```

---

## Environment variables

Copy `.env.staging.example` → `.env.staging`. Critical fields:

| Variable | Staging example |
|----------|-----------------|
| `APP_PUBLIC_URL` | `https://staging.motivefx.ai` |
| `CORS_ORIGINS` | Same URL (+ localhost if testing) |
| `JWT_SECRET_KEY` | 64 hex chars (`scripts/generate-secrets.ps1`) |
| `ADMIN_API_KEY` | Random string — **not** `motivefx-admin-dev` |
| `EXPOSE_RESET_LINKS` | `false` on any public URL |
| `AUTH_ENFORCE` | `true` |
| `STRIPE_*` | **Test mode** keys from Stripe Dashboard |

---

## Option A — Single VPS / Docker Compose (recommended for staging)

1. Provision a small VM (2 GB RAM, Ubuntu 22+).
2. Install Docker + Docker Compose.
3. Clone repo, configure `.env.staging`.
4. Point DNS `staging.motivefx.ai` → server IP.
5. Run `docker compose -f docker-compose.staging.yml up -d --build`.
6. Put **Caddy** or **Cloudflare** in front for HTTPS:

**Caddy example** (`/etc/caddy/Caddyfile`):

```
staging.motivefx.ai {
    reverse_proxy localhost:8080
}
```

Update `.env.staging`:

```env
APP_PUBLIC_URL=https://staging.motivefx.ai
CORS_ORIGINS=https://staging.motivefx.ai
```

Restart API container after env changes.

---

## Option B — Railway (API) + Cloudflare Pages (web)

### API on Railway

1. Install [Railway CLI](https://docs.railway.app/develop/cli).
2. `railway login` → `railway init` in repo root.
3. `railway.toml` is included — builds `Dockerfile`.
4. In Railway dashboard → **Variables**: paste from `.env.staging`.
5. Add a **Volume** mounted at `/app/backend/data`.
6. Deploy: `railway up`
7. Note the public URL, e.g. `https://motivefx-api-production.up.railway.app`

### Web on Cloudflare Pages

1. Connect GitHub repo → build command: `cd web && npm ci && npm run build`
2. Output directory: `web/dist`
3. Add **Redirects** (or `_redirects` file) for SPA + API proxy:

Create `web/public/_redirects` for Cloudflare:

```
/api/*  https://YOUR-RAILWAY-API.up.railway.app/api/:splat  200
/go/*   https://YOUR-RAILWAY-API.up.railway.app/go/:splat   200
/*      /index.html   200
```

Set `APP_PUBLIC_URL` to your Cloudflare Pages URL.

---

## Option C — Fly.io (API only)

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/).
2. `fly launch --no-deploy` (uses included `fly.toml`).
3. Create volume: `fly volumes create motivefx_data --size 1 --region yyz`
4. Set secrets from `.env.staging` (one per line): `fly secrets set KEY=value ...`
5. `fly deploy`
6. Deploy web via `Dockerfile.web` on Fly as a second app, or Cloudflare Pages as in Option B.

---

## Stripe webhooks (staging)

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://staging.motivefx.ai/api/billing/webhook` (or Railway URL + `/api/billing/webhook`).
3. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in `.env.staging`.

---

## Post-deploy checklist

- [ ] `GET /api/health` returns 200
- [ ] Create account → sign in → modules load
- [ ] Subscribe (Stripe test card `4242…`)
- [ ] Webhook received (Stripe dashboard → event log)
- [ ] `/go/ig` redirects with UTM
- [ ] Forgot password (SMTP or check logs if `EXPOSE_RESET_LINKS=true` locally only)
- [ ] Ops Console: `?view=admin` with new `ADMIN_API_KEY`
- [ ] `EXPOSE_RESET_LINKS=false` on public staging

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 on `/api/advisor/*` | Sign in — auth is required for user data |
| CORS errors | `CORS_ORIGINS` must exactly match browser URL |
| Stripe webhook fails | URL must be HTTPS; check `STRIPE_WEBHOOK_SECRET` |
| DB resets on deploy | Mount volume at `/app/backend/data` |
| Blank page after deploy | nginx `try_files` — rebuild `Dockerfile.web` |

---

## Files reference

| File | Purpose |
|------|---------|
| `docker-compose.staging.yml` | Full local/VM stack |
| `Dockerfile` | API image |
| `Dockerfile.web` | nginx + React build |
| `deploy/nginx.conf` | Reverse proxy rules |
| `railway.toml` | Railway API deploy |
| `fly.toml` | Fly.io API deploy |
| `.env.staging.example` | Env template |
| `scripts/staging-up.ps1` | One-command local staging |

---

*After staging beta validates, swap Stripe to live keys and point production domain using the same pattern.*
