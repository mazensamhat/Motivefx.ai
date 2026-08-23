# MotiveFX.ai — Final Production Hardening Plan

> **Status:** Adopted as pre-launch source of truth (2026-08-23).  
> **Sprint 1–3 in flight** — Market Truth + Signal framing + Security foundation shipping to production.  
> **No major product features until G1–G4 pass.** G5–G7 complete certification.

## Governing principles

1. **Evidence owns truth. Deterministic engines interpret it. AI explains it. Demo data never crosses the production boundary.**
2. **Never spend an AI token calculating something deterministic code can calculate.**

## Release gates

| Gate | Objective | Priority | AI-token impact |
|------|-----------|---------:|----------------:|
| **G1** | Market Truth & Provenance | P0 | None |
| **G2** | Motive Signal Integrity | P0 | None |
| **G3** | Security & Authorization | P0 | None |
| **G4** | Native/App-Store Compliance | P0 | None |
| **G5** | AI Reliability & Economics | P0/P1 | **Lower** |
| **G6** | Outcomes & Calibration | P1 | None |
| **G7** | CI, QA & Production Certification | P0 | None |

## Sprint order

| Sprint | Focus | Maps to |
|--------|-------|---------|
| 1 — Truth | MarketEvidence, DataMode, demo isolation, Evidence Ledger, freshness, provider health | G1 |
| 2 — Signal | Remove demo priors, confluence /100, evidence groups, quality, confidence, neutral copy | G2 |
| 3 — Security | UA entitlement, anonymous user_id, tokens, Keychain, metering, attestation | G3 |
| 4 — Compliance | ChannelCapabilities, Claim Registry, execution links, bridge version | G4 |
| 5 — AI economics | MotiveBriefingContext, budgets, one-call, cache, fallback | G5 |
| 6 — Outcomes | Signal Snapshot, Outcome Engine, backtest (start recording ASAP after G1/G2) | G6 |
| 7 — Certification | Golden tests, release-gate CI, Truth Console, device matrix | G7 |

## G1 release requirement (hard fail)

```text
DEMO evidence in production signal = 0
SYNTHETIC evidence in production signal = 0
Unattributed evidence = 0
Expired evidence contribution = 0
```

## Implementation notes

- Canonical types: `apps/site/src/lib/terminal/market-truth/`
- Operating mode env: `MOTIVEFX_DATA_MODE` = `PRODUCTION` | `DEMO` | `TEST` | `APP_REVIEW`
- Live scanners must never call demo helpers when mode is `PRODUCTION`
- Provider failure → typed unavailable codes (`LIVE_DATA_UNAVAILABLE`, `WHALE_FEED_UNAVAILABLE`), never silent synthetic substitution

## Related docs

- `docs/LAUNCH_READINESS.md` — store/legal checklist (defer to this plan for truth/security/AI)
- `docs/MOTIVEFX-EXPERT-REVIEW.md` — expert inputs that shaped G1–G7

## Certification target

```text
MOTIVEFX PRODUCTION CERTIFICATION
… (see chat plan / Truth Console)
PUBLIC RELEASE: APPROVED
```
