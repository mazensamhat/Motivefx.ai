# MotiveFX Ops Console — Master Plan

> **Status:** Adopted product master plan (2026-08-24).  
> **Current score:** ~7.9/10 · **Target:** 9.5+  
> **Related:** [PRODUCTION_HARDENING_MASTER_PLAN.md](./PRODUCTION_HARDENING_MASTER_PLAN.md) — G1 Truth Console overlaps **Market Truth** page.

## Thesis

Backend capabilities (market truth, signal integrity, provider health, financial analytics, platform monitor) exceed what the Ops product surface presents today. MotiveFX Ops should revolve around **market truth, signals, provider health, customers, and revenue** — not one giant `/admin` scroll page.

**Do not rebuild marketing in MotiveFX.** Growth → shared [Motive Life Marketing Studio](https://www.mymotivelife.com/admin) (see `apps/site/src/lib/ops-links.ts`).

## Design principles

| Principle | Implementation |
|-----------|----------------|
| Bloomberg discipline | Dense KPIs, monospace IDs, status dots, no fluff |
| Stripe clarity | Left nav, one job per page, progressive disclosure |
| Dark terminal aesthetic | Slate/graphite base (`--bg-deep`), MotiveFX gold (`#00e676`) + cyan (`#00e5ff`) accents |
| Reuse, don't rebuild | `FinancialPanel`, `PlatformMonitorPanel`, `SiteUsersPanel`, existing admin APIs |
| Truth before features | Market Truth page wired to G1 ledger before Signal Ops depth |

## Score rubric

| Area | Today | Target | Notes |
|------|------:|-------:|-------|
| Information architecture | 5.5 | 9.5 | Single scroll → left-nav domains |
| Market truth visibility | 6.0 | 9.5 | Ledger + contamination + golden checks (G1) |
| Provider ops | 4.0 | 9.0 | Kill switches exist; need UI + latency/error rollups |
| Revenue & financial | 8.5 | 9.5 | `FinancialPanel` strong; needs dedicated Revenue route |
| User & growth ops | 7.0 | 9.0 | Site users + signup map exist; Growth = MotiveLife link |
| Platform monitor | 8.0 | 9.0 | Cross-product tiles; keep on Overview + Product |
| Security & compliance | 6.5 | 9.5 | G3/G4 gates; Security page stub → entitlements audit |
| AI economics | 5.0 | 9.0 | Legacy Vite admin has AI analysis; site admin lacks |
| Release readiness | 7.0 | 9.5 | Tie to hardening gates G1–G7 |
| **Overall** | **7.9** | **9.5+** | Sprint 1 ships shell + Market Truth + Providers |

## Navigation architecture

```
/admin                          → redirect /admin/overview
/admin/overview                 Executive cockpit (KPIs, platform pulse)
/admin/market-truth             G1 Truth Console (ledger, contamination, golden)
/admin/signals                  Signal ops (quality, confluence, outcomes) — Sprint 2
/admin/providers                Provider kill switches + health — Sprint 1
/admin/users                    Site users, signup map, demographics
/admin/revenue                  FinancialPanel + Stripe status
/admin/product                  Module health, utilization, heatmap
/admin/growth                   External → Motive Life Marketing Studio
/admin/security                 Entitlements, admin audit, native attestation — Sprint 3
/admin/ai-costs                 Token budgets, model usage — Sprint 5
/admin/feedback                 FeedbackInboxPanel
/admin/releases                 Gate tracker (G1–G7), deploy history — Sprint 7
/admin/settings                 Admin emails, env flags, ops links
/admin/legacy                   Full scroll dashboard (backward compat)
```

## What exists today

### Site admin (`apps/site`)

| Asset | Path | Route / API |
|-------|------|-------------|
| Admin page (session gate) | `src/app/admin/page.tsx` | `/admin` |
| Admin layout (auth) | `src/app/admin/layout.tsx` | all `/admin/*` |
| Monolithic dashboard | `src/components/admin/admin-dashboard.tsx` | legacy view |
| Financial analytics | `src/components/admin/financial-panel.tsx` | `GET /api/admin/financial` |
| Platform monitor | `src/components/admin/platform-monitor-panel.tsx` | `GET /api/admin/platforms` |
| Site users | `src/components/admin/site-users-panel.tsx` | `GET /api/admin/site-users` |
| Feedback inbox | `src/components/admin/feedback-inbox-panel.tsx` | `GET /api/admin/feedback` |
| Signup map | `src/components/admin/signup-map.tsx` | via `GET /api/admin/site-dashboard` |
| Terminal analytics | `src/lib/terminal-admin-analytics.ts` | `GET /api/admin/dashboard` |
| Financial engine | `src/lib/admin-financial-analytics.ts` | `GET /api/admin/financial` |
| Admin API client | `src/lib/admin-api.ts` | fetch wrapper |
| Cross-product ops links | `src/lib/ops-links.ts` | MotiveLife, MotivePulse, MotiveIQ |

### Legacy Vite terminal admin (`web/`)

| Asset | Path | Notes |
|-------|------|-------|
| Embedded admin | `web/src/components/AdminDashboard.tsx` | API-key auth, AI analysis, social integrations |
| Admin API | `web/src/lib/adminApi.ts` | Separate from site session admin |
| Ops link in terminal | `web/src/App.tsx`, `web/src/components/AccountMenu.tsx` | `/admin` on site embed |

### Market truth & providers (G1 / G3)

| Asset | Path | Purpose |
|-------|------|---------|
| Canonical types | `src/lib/terminal/market-truth/` | Evidence, data mode, freshness |
| Evidence ledger | `market-truth/evidence-ledger.ts` | In-process signal evidence log |
| Golden checks | `market-truth/golden.ts` | Demo rejection / live pass invariants |
| Data mode | `market-truth/data-mode.ts` | `MOTIVEFX_DATA_MODE` boundary |
| Provider kill switches | `src/lib/terminal/provider-switches.ts` | `FINNHUB_ENABLED`, etc. |
| Feed integration | `src/lib/terminal/feeds/index.ts` | Uses data mode + provider switches |

### Admin API routes (site)

- `GET /api/admin/dashboard` — terminal KPIs, heatmap, demographics
- `GET /api/admin/site-dashboard` — signups, signup map
- `GET /api/admin/financial` — revenue, costs, margins
- `GET /api/admin/platforms` — cross-product platform monitor
- `GET /api/admin/site-users`, `GET/PATCH /api/admin/site-users/[id]`
- `GET /api/admin/feedback`, `GET /api/admin/email-status`, `GET /api/admin/stripe-status`

### Gaps (Ops product)

| Gap | Hardening gate | Sprint |
|-----|----------------|--------|
| Left-nav Ops shell | — | 1 ✅ started |
| Market Truth API + page | G1 | 1 ✅ started |
| Provider ops UI | G3 | 1 ✅ started |
| Signal ops (confluence, quality) | G2 | 2 |
| Security / entitlement audit UI | G3 | 3 |
| AI cost dashboard | G5 | 5 |
| Release gate tracker | G7 | 7 |
| Durable evidence ledger (DB) | G6 | 6 |
| Growth marketing | — | External MotiveLife only |

## Five-sprint build priority

Aligned with [PRODUCTION_HARDENING_MASTER_PLAN.md](./PRODUCTION_HARDENING_MASTER_PLAN.md) sprints.

### Sprint 1 — Ops shell + Truth + Providers *(in flight)*

- Left-nav `OpsShell` with dark terminal aesthetic
- **Overview:** executive KPIs + platform pulse (reuse APIs)
- **Market Truth:** data mode, contamination stats, golden checks, recent ledger
- **Providers:** env kill-switch readout
- `/admin/legacy` preserves monolithic dashboard
- APIs: `GET /api/admin/market-truth`, `GET /api/admin/providers`

### Sprint 2 — Signal Ops

- Wire Motive Signal engine metrics (confluence /100, evidence groups)
- Signal quality histogram, neutral-copy violations
- Per-symbol evidence drill-down from ledger
- Map to G2 release requirements

### Sprint 3 — Users + Security

- `/admin/users` — migrate `SiteUsersPanel` + signup map
- `/admin/security` — admin roster, session audit, native reader tokens
- Entitlement matrix (UA, anonymous user_id)

### Sprint 4 — Revenue + Product + Feedback

- `/admin/revenue` — `FinancialPanel` + Stripe status
- `/admin/product` — module health, heatmap, utilization
- `/admin/feedback` — inbox panel

### Sprint 5 — AI Costs + Releases + Settings

- `/admin/ai-costs` — token budgets, model breakdown (port from Vite admin where useful)
- `/admin/releases` — G1–G7 gate tracker canvas
- `/admin/settings` — ops links, data mode display, admin emails

## Ops gate tracker canvas (optional)

Path for a future Cursor canvas: `docs/canvas/motivefx-ops-gates.canvas.tsx` — live G1–G7 checklist fed by `/api/admin/releases` (Sprint 5). Not blocking Sprint 1.

## Implementation file map (Sprint 1)

```
apps/site/src/
  components/admin/
    ops-shell.tsx
    ops-nav.ts
    ops-overview.tsx
    ops-market-truth.tsx
    ops-providers.tsx
    ops-stub-page.tsx
  app/admin/
    (console)/layout.tsx
    (console)/overview/page.tsx
    (console)/market-truth/page.tsx
    (console)/providers/page.tsx
    (console)/signals/page.tsx          # stub
    (console)/users/page.tsx            # stub
    ...
    legacy/page.tsx
  app/api/admin/
    market-truth/route.ts
    providers/route.ts
```

## Authorization

All `/admin/*` and `/api/admin/*` routes require session + `ADMIN_EMAILS` (see `src/lib/admin.ts`). Provider kill switches remain env-only (read in Sprint 1; write via deploy in Sprint 3+).
