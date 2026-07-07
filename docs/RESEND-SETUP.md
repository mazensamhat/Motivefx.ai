# Resend email — shared with Motive Life

MotiveFX uses the **same Resend account** as Motive Life. No second domain, no Resend upgrade.

**Sender:** `MotiveFX <hello@mymotivelife.com>`  
**Verified domain:** `mymotivelife.com` (already set up for Motive Life)

Emails show **MotiveFX** as the display name; the address is the shared `hello@mymotivelife.com` mailbox.

---

## Setup (~5 min)

### 1. Copy env vars from Motive Life Vercel

Vercel → **motivelife-web** → Settings → Environment Variables → **Production**:

| Copy from Motive Life | Paste into MotiveFX Vercel |
|-----------------------|----------------------------|
| `RESEND_API_KEY` | Same value |

### 2. Set MotiveFX-specific sender

On **motivefx-ai-site** Vercel → Production:

| Variable | Value |
|----------|--------|
| `RESEND_API_KEY` | Same `re_...` as Motive Life |
| `EMAIL_FROM` | `MotiveFX <hello@mymotivelife.com>` |

Do **not** add `motivefxai.com` to Resend — that would use a second domain slot.

### 3. Redeploy MotiveFX

Trigger a production deploy after saving env vars.

### 4. Test

1. `GET https://www.motivefxai.com/api/system/email-health`  
   - `domain.status` should be `verified`  
   - `resendDomain` should be `mymotivelife.com`
2. Sign in → `/app/settings` → **Send test email**
3. `/login` → **Forgot password?**

---

## Local development

`apps/site/.env.local`:

```env
RESEND_API_KEY="re_..."   # same key as Motive Life
EMAIL_FROM="MotiveFX <hello@mymotivelife.com>"
```

In dev without Resend, forgot-password logs the reset link to the server console.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `403` from Resend | `EMAIL_FROM` must use `@mymotivelife.com` |
| Key works on Motive Life, not MotiveFX | Add `RESEND_API_KEY` to MotiveFX **Production** (not Preview only) |
| Domain not verified | Fix on Motive Life side — Resend → Domains → `mymotivelife.com` |

---

## Later: dedicated `@motivefxai.com` email

When you upgrade Resend or want a separate domain, add `motivefxai.com` in Resend and switch `EMAIL_FROM` to `MotiveFX <hello@motivefxai.com>`.
