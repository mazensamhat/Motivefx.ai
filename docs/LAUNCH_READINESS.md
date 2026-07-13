# MotiveFX.AI — Launch Readiness Checklist

> Living document for production launch across web, iOS, Android, Canada, US, and global markets.  
> **Status:** In progress — auth, 2FA, and legal drafts implemented; store submission and counsel review pending.

---

## P0 — Blockers (must complete before public launch)

### Identity & security
- [x] Email/password registration and login (`POST /api/auth/register`, `/login`)
- [x] JWT access + refresh tokens with rotation
- [x] TOTP two-factor authentication (setup, confirm, disable)
- [x] Anonymous → authenticated account merge on signup
- [x] **Require auth** for portfolio, billing, and user data routes (`AUTH_ENFORCE=true`)
- [ ] Rotate `JWT_SECRET_KEY` and `ADMIN_API_KEY` in production secrets manager
- [x] Password reset flow
- [ ] Email verification flow
- [x] Rate limiting on auth endpoints
- [x] Account deletion + data export endpoints (PIPEDA / CCPA)

### Legal & compliance (drafts in app — **lawyer review required**)
- [x] Privacy Policy page (`/?page=privacy`)
- [x] Terms of Service page (`/?page=terms`)
- [x] Signup consent checkboxes (privacy, terms, optional marketing)
- [x] Financial / gambling disclaimer in footer and terms
- [ ] Engage Canadian privacy counsel (PIPEDA / Quebec Law 25)
- [ ] US state privacy assessment (CCPA/CPRA if CA users)
- [ ] GDPR readiness if EU signups allowed
- [ ] Cookie / analytics consent banner (if adding third-party analytics)
- [x] Age gate (18+/19+) for betting & predictions modules
- [ ] Record of Processing Activities (ROPA) for OpenAI + Stripe

### Infrastructure
- [ ] Migrate SQLite → PostgreSQL (production)
- [ ] HTTPS everywhere, HSTS, security headers (CSP, X-Frame-Options)
- [ ] Encrypted backups + tested restore
- [ ] Production hosting (API + web CDN) — see `docs/STAGING_DEPLOY.md`
- [ ] Set `APP_PUBLIC_URL`, `CORS_ORIGINS`, `JWT_SECRET_KEY` in production env
- [ ] Disable demo billing bypass when Stripe is live

### Payments
- [x] Stripe Checkout with acquisition metadata
- [x] Stripe Customer Portal for self-service cancel
- [ ] Webhook monitoring + idempotency
- [ ] FTC Negative Option Rule compliance (trial disclosure emails)

---

## P1 — App Store & Play Store

See [MOBILE_STRATEGY.md](./MOBILE_STRATEGY.md) for full mobile plan.

- [x] Expo app shell with env-based API URL
- [x] Android native project scaffold (`expo prebuild`, `eas.json`) — see `docs/ANDROID_PLAY_STORE.md`
- [x] Terminal WebView loads full mobile UI (`MobileBottomNav` design parity)
- [x] Mobile-first terminal CSS (`viewport-fit`, safe-area, `100dvh`, native-shell class)
- [x] Mobile auth screen (login/register)
- [x] **Billing model decision:** web-only subscribe (document in store listings); native IAP deferred
- [ ] Apple Developer + Google Play Console accounts
- [ ] Privacy Nutrition Labels / Data safety form
- [ ] Sign in with Apple (required if offering Google login on iOS)
- [ ] App icons, screenshots, store descriptions
- [ ] Financial app review prep (disclaimers in-app)
- [ ] Geo-fencing for betting module where restricted

---

## P2 — Hardening & scale

- [ ] Passkeys / WebAuthn
- [ ] Biometric app unlock (mobile)
- [ ] SOC 2 Type I (if B2B)
- [ ] Penetration test
- [ ] Cyber insurance
- [ ] Status page + on-call
- [ ] Sentry / structured logging
- [ ] Quebec French localization (Law 25)

---

## Jurisdiction quick reference

| Region | Primary law | Key obligations |
|--------|-------------|-----------------|
| **Canada** | PIPEDA, provincial (ON, QC Law 25, BC PIPA) | Consent, access/correction, breach notification, privacy officer |
| **United States** | CCPA/CPRA, state laws, FTC | Deletion rights, subscription disclosure, no false performance claims |
| **EU/UK** | GDPR | Lawful basis, DPA with processors, 72h breach notice, DPO if large scale |
| **Securities** | CSA (CA), SEC (US) | Information-only; no personalized investment advice without registration |
| **Gambling** | Provincial (CA), state (US) | Analytics only; no wagering facilitation; age + geo restrictions |

---

## Data inventory (what we store today)

| Category | Fields | Retention target |
|----------|--------|------------------|
| Account | email, password hash, display name, 2FA secret | Life of account |
| Demographics | cohort, sex, gender, age (optional) | Life of account |
| Portfolios | holdings JSON per module | Life of account |
| Telemetry | usage_events (endpoint, module, timing) | 90 days |
| Payments | amount, tier, Stripe IDs | 7 years |
| Marketing | acquisition_channel, touchpoints | 2 years |

---

## Environment variables (production)

```env
JWT_SECRET_KEY=           # 32+ random bytes — REQUIRED
ADMIN_API_KEY=            # Strong random — REQUIRED
APP_PUBLIC_URL=https://motivefx.ai
CORS_ORIGINS=https://motivefx.ai
DATABASE_URL=             # PostgreSQL when migrated
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Pre-launch test plan

1. Register → verify portfolios merge from anonymous session
2. Enable 2FA → logout → login with TOTP
3. Subscribe (Stripe test mode) → webhook activates modules
4. Cancel via Stripe Portal → access revoked
5. Privacy/Terms links from signup and footer
6. Mobile login against staging API
7. Admin console inaccessible without rotated key

---

## Contacts (placeholder — update before launch)

| Role | Contact |
|------|---------|
| Privacy Officer | privacy@motivefx.ai |
| Support | support@motivefx.ai |
| Legal counsel | _TBD_ |

### Legal entity (interim)

- **Jurisdiction** published as Ontario, Canada (aligned with Terms governing-law clause).
- **Registered street address** is not confirmed in-repo. Privacy/terms use: correspondence via `privacy@motivefx.ai` with mailing address available on written request to the Privacy Officer.
- **Action:** Replace interim address string in `apps/site/src/lib/legal.ts` and `web/src/legal/entity.ts` once counsel confirms the registered office.

### Public demo

- Ungated product preview: `https://www.motivefxai.com/demo`
- Read-only terminal: `https://www.motivefxai.com/terminal/?demo=1` (sets `motivefx_demo` cookie; no private user data)

### Social

- Footer Follow links default to MotiveFX Instagram / Facebook / LinkedIn (`apps/site/src/lib/social.ts`). Optional overrides: `SOCIAL_INSTAGRAM_URL`, `SOCIAL_FACEBOOK_URL`, `SOCIAL_LINKEDIN_URL`. Do not use MotiveLife profiles.

---

*Last updated: July 13, 2026*
