# FastAPI on Render — motivefx-api

Deploy the Python backend so the Vercel site can proxy live market feeds.

**Blueprint (one click):**  
https://dashboard.render.com/blueprint/new?repo=https://github.com/mazensamhat/Motivefx.ai

---

## Prerequisites

- Render account on a **paid** workspace (Starter plan — persistent disk required)
- GitHub repo connected to Render
- `main` branch includes `render.yaml` + root `Dockerfile`

---

## 1. Generate secrets

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai
.\scripts\generate-production-secrets.ps1
```

Save the output — you will paste values into Render and Vercel.

---

## 2. Apply Blueprint

1. Open the [Blueprint link](https://dashboard.render.com/blueprint/new?repo=https://github.com/mazensamhat/Motivefx.ai)
2. Review service **`motivefx-api`** (Docker, Starter, 1 GB disk at `/var/data`)
3. When prompted for secrets:
   - `JWT_SECRET_KEY` — from script (Render only)
   - `BACKEND_SYNC_SECRET` — from script (**same on Vercel**)
4. Click **Apply**

Build takes ~5–10 minutes on first deploy.

---

## 3. Verify API

```powershell
curl https://motivefx-api.onrender.com/api/health
```

Expected: `{"status":"ok","app":"MotiveFX.AI",...}`

Use the exact URL from Render Dashboard if the hostname differs.

---

## 4. Wire Vercel → Render

Vercel → **motivefx-ai-site** → Environment Variables → **Production**:

| Variable | Value |
|----------|--------|
| `MOTIVEFX_API_URL` | `https://motivefx-api.onrender.com` (your Render URL) |
| `BACKEND_SYNC_SECRET` | Same value as Render |

**Redeploy** Vercel.

---

## 5. End-to-end check

1. `GET https://www.motivefxai.com/api/system/health` → `backend: true`
2. Sign in → `/app` → no “Backend tools offline” banner
3. Open `/app/markets/stocks` → live feed (or preview if not subscribed)

---

## Env vars reference (Render)

| Variable | Required | Notes |
|----------|----------|--------|
| `JWT_SECRET_KEY` | Yes | Render only |
| `BACKEND_SYNC_SECRET` | Yes | Must match Vercel |
| `MOTIVEFX_DATA_DIR` | Auto | `/var/data` (SQLite) |
| `CORS_ORIGINS` | Auto | motivefxai.com domains |
| `APP_PUBLIC_URL` | Auto | `https://www.motivefxai.com` |
| `AUTH_ENFORCE` | Auto | `true` |
| `EXPOSE_RESET_LINKS` | Auto | `false` |
| `FINNHUB_API_KEY` | Optional | Live stock feeds |
| `OPENAI_API_KEY` | Optional | Advisor LLM |
| `THE_ODDS_API_KEY` | Optional | Sports lines |
| `COINSTATS_API_KEY` | Optional | Crypto whales |

Billing webhooks stay on **Vercel** (`/api/webhooks/stripe`), not FastAPI.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check Render logs; confirm `Dockerfile` at repo root |
| Health check fails | Service must respond on `$PORT`; path `/api/health` |
| `backend: false` on Vercel | Wrong `MOTIVEFX_API_URL` or API still deploying |
| Sync fails / 403 | `BACKEND_SYNC_SECRET` mismatch between Vercel and Render |
| Empty feeds | Add API keys in Render env; redeploy |
| Cold start (Free plan) | Use **Starter** — blueprint sets `plan: starter` |
