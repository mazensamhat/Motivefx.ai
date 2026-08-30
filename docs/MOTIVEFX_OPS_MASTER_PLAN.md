# MotiveFX Ops — Operations Master Plan v1.0

> **Status:** Adopted source of truth (2026-08-28). **Implementation (2026-08-30):** P0–P3 Ops surfaces are live. Durable core includes Postgres telemetry/audit/incidents/AI usage, SignalSnapshot + outcomes + calibration, look-ahead-safe replay, Graph/DNA dual-write, Creative Lab. Market Intel reads fall back to durable stores on cold start. Provider Health / Jobs / Pipelines derive from telemetry (no fabricated 99.9% metrics). Admin routes enforce capability checks; Roles & Access UI lists grants. Remaining stretch: multi-role RBAC matrix, Support Center tickets, automated provider failover, predictive incidents.  
> **Rule:** Keep the existing Ops foundation. Harden → standardize telemetry → market-truth observability → intelligence quality → user/commercial/platform ops.  
> **Related:** [PRODUCTION_HARDENING_MASTER_PLAN.md](./PRODUCTION_HARDENING_MASTER_PLAN.md) · [MOTIVEFX_CREATIVE_INTELLIGENCE.md](./MOTIVEFX_CREATIVE_INTELLIGENCE.md)  
> **UI:** Light operational canvas (not the consumer terminal). See `/admin/overview`.

## 1. Mission

**MotiveFX Ops is the internal operating system for the entire MotiveFX platform.**

It is not just an admin dashboard. The customer-facing product helps users understand developing market signals, themes, relationships, opportunities and evidence. Ops must tell us whether **the intelligence itself is healthy, accurate, fresh, explainable, commercially valuable and operationally reliable**.

At any moment Ops should answer:

- Is MotiveFX healthy right now?
- Are market-data providers working? Are any feeds delayed or stale?
- Are Motive Signals being generated correctly? Are confidence scores calibrated?
- Which signals are strengthening/weakening, or later proved correct/incorrect?
- Are Opportunity Radar / Market DNA / Evidence Stack built from legitimate evidence?
- What did AI generate vs what deterministic code calculated?
- Are any simulated/demo signals appearing as live?
- Users, conversions, retention drivers, AI/data cost per user?
- Which provider caused a degradation? Can we impersonate to reproduce?
- Who changed an intelligence configuration? What requires attention right now?

**Long-term goal:** MotiveFX Ops becomes the operational truth layer for MotiveFX intelligence, customers, data, infrastructure and business performance.

## 2. Do Not Rebuild the Existing Foundation

Keep:

```text
Overview · Users · Product · Signals · Market Truth · Providers
AI Costs · Revenue · Feedback · Releases · Security · Settings
```

Plus session auth + admin-email gate before the Ops shell.

```text
KEEP THE FOUNDATION
        ↓
HARDEN PERMISSIONS
        ↓
STANDARDIZE TELEMETRY
        ↓
BUILD MARKET-TRUTH OBSERVABILITY
        ↓
BUILD INTELLIGENCE QUALITY
        ↓
IMPROVE USER OPERATIONS
        ↓
IMPROVE COMMERCIAL INTELLIGENCE
        ↓
IMPROVE PLATFORM OPERATIONS
```

## 3. Core Rule: Market Truth Before AI

> **Data establishes truth. Code calculates. AI interprets and explains.**

AI must never silently invent prices, volumes, signal scores, confidence, probability, historical performance, relationships, provider state, revenue, user activity, or portfolio values.

```text
RAW SOURCE → NORMALIZATION → VALIDATION → MARKET TRUTH
  → FEATURE / SIGNAL CALCULATION → CONFLUENCE → MOTIVE SIGNAL
  → CONFIDENCE → EVIDENCE STACK → AI EXPLANATION → UX
```

## 4. Canonical Registries (code)

| Registry | Path |
|----------|------|
| Products & desks | `apps/site/src/lib/ops/product-registry.ts` |
| Events | `apps/site/src/lib/ops/event-registry.ts` |
| Telemetry envelope | `apps/site/src/lib/ops/telemetry-envelope.ts` |
| Truth states | `apps/site/src/lib/ops/truth-state.ts` |
| Provenance | `apps/site/src/lib/ops/provenance.ts` |
| Source rights | `apps/site/src/lib/ops/source-rights.ts` |
| RBAC | `apps/site/src/lib/ops/rbac.ts` |
| Audit | `apps/site/src/lib/ops/audit.ts` |
| AI model/prompt registry | `apps/site/src/lib/ops/ai-model-registry.ts` |

Unknown product/desk/event values become `UNKNOWN` and are surfaced as instrumentation errors.

## 5. Live vs Delayed vs Simulated

Every data element has an explicit truth state:

```text
LIVE | DELAYED | CACHED | ESTIMATED | DERIVED
SIMULATED | DEMO | UNAVAILABLE | STALE | UNKNOWN
```

`SIMULATED` / `DEMO` must never look operationally identical to `LIVE` — backend enforcement + Ops visibility.

## 6. Navigation (target)

```text
COMMAND          Overview · Live Operations · Alerts & Incidents
MARKET INTEL     Market Truth · Motive Signals · Opportunity Radar · Signal Graph
                 Market DNA · Daily Brief · Evidence Quality
MARKET DATA      Providers · Feed Health · Coverage · Freshness · Data Rights
PRODUCT          Product Analytics · Users · Portfolios · Alerts · Feedback
AI               AI Operations · Prompt/Model Registry · AI Costs · AI Quality
BUSINESS         Subscriptions · Revenue · Growth · Costs
PLATFORM         API Health · Jobs · Pipelines · Releases · Runtime Config
GOVERNANCE       Security · Audit Log · Roles & Access · Compliance
SYSTEM           Settings
SISTER CONSOLES  MyMotiveLife Ops · MotivePulse Ops
```

Existing routes stay live. Market Intel / Jobs / Providers prefer durable telemetry and snapshots over process-local fiction.

## 7. Command Center

Default page answers: **What requires attention?**

Then: attention list → business KPIs → intelligence health (Market Truth, Motive Signal, Radar, Graph, DNA, Daily Brief).

## 8. Phased delivery

### P0 (now)

- Canonical product + event registries
- Telemetry envelope
- Market truth states + provenance
- Live / delayed / simulated enforcement helpers
- Provider freshness monitoring hooks
- Signal explainability + confidence calibration contracts
- RBAC redesign (capability model)
- Audit engine types + recorder stub
- Secure impersonation contract (types; UI later)
- Prompt / model version registry
- Source rights registry (fail-closed unknown)

### P1

- New navigation groups + Command Center
- Global Search (Ctrl/Cmd+K)
- Market Truth Control Room
- Provider Health v2
- Motive Signal / Opportunity Radar / Evidence Stack ops
- User 360 v2 · Support Center · AI Operations · Alerts & Incidents

### P2

- Signal Graph · Market DNA · Daily Brief ops
- Outcome tracking · cross-provider reconciliation
- Revenue Control Room · funnels · retention
- Portfolio / alert analytics · release intelligence
- Background jobs · pipeline monitoring

### P3

- Historical replay · backtesting · calibration dashboards
- Intelligence debugger · contradiction / anomaly detection
- Provider failover automation · AI Ops Assistant
- Advanced cost attribution · predictive incidents

## 9. Visual design

Light operational canvas · high density · strong typography · clear tables · subtle borders.

| Color | Meaning |
|-------|---------|
| Green | Healthy / verified |
| Amber | Warning / uncertainty |
| Red | Critical / invalid |
| Purple | AI / intelligence |
| Blue | Market data |
| Gray | Unknown / inactive |

## 10. The 30-second standard

When you open MotiveFX Ops you should know within ~30 seconds whether markets are feeding correctly, engines are healthy, evidence is fresh, demo is not masquerading as live, signals are calibrated, providers/AI/users/revenue are healthy — or **exactly what is wrong, who is affected, when it started, what caused it, and what we can safely do**.

The critical difference from MyMotiveLife Ops: **MotiveFX Ops must monitor the truthfulness and quality of the intelligence itself**, not only the software.
