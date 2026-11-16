# Incident durability and observed telemetry

## Corrected failure modes

The incident API previously returned `ok: true` before its database update completed, while the persistence helper swallowed failures. Its success audit was a separate fire-and-forget write. The UI ignored failed responses and could display “All systems clear” when data had never loaded. A deterministic sample-count/rate formula was also presented as forecast confidence.

The corrected path:

- Requires `view_audit` to read and `manage_runtime_config` to change an incident. Existing role assignments and the legacy full-admin fallback are unchanged.
- Validates the incident identity and supported transition at runtime, rejects cross-origin browser mutations and awaits persistence before responding.
- Locks the incident row and commits its status and success audit in one transaction. Missing records return 404; failed transactions return a failure. Reopening clears the old resolution timestamp.
- Awaits the existing Command Attention materialization before loading durable records. Recurrent live conditions reopen a resolved incident durably. This existing GET materialization is **not a read-only endpoint** for an authenticated operator; do not use it as a production no-write smoke probe.
- Uses strict incident/telemetry reads for this desk. A failed load is unknown; the UI disables actions and displays the failure. Unrelated legacy consumers retain their existing fallback behavior.
- Counts acknowledged/investigating incidents as active, excludes resolved records from the critical count, and shows bounded observed telemetry rather than an invented probability.

## What the telemetry indicator means

The desk examines at most the newest 500 persisted telemetry events within six hours. It ignores invalid and future observation times and needs at least five events per domain. An error/timeout rate of 15% or stale/unavailable rate of 30% is a warning; 40% error or 60% stale/unavailable is high. These are explicit operational thresholds over a bounded sample, not uptime statistics or a calibrated future incident probability. No matching indicator can mean insufficient samples. The incident table is also bounded to 100 recent durable records plus current materialized conditions.

The existing API `forecasts` field and function name remain for compatibility, but each record identifies its `basis` as `observed_telemetry` and has no `confidence` value. The UI shows sample counts and the observed rates. Provider failover remains a separate integration/policy requirement; this desk does not activate a replacement feed.

## Validation and remaining acceptance

`tests/ops-incident-durability.test.mjs` exercises transaction rollback when audit persistence fails, missing records, durable reopening, strict unavailable reads, awaited materialization, future/insufficient samples, capability denial, runtime input checks, HTTP completion ordering, error responses and active counts. The existing RBAC/incident tests preserve assignment behavior and verify that no confidence claim is emitted. The original focused tests use transaction-aware doubles. The additional actual PostgreSQL acceptance in `TRANSACTIONAL_POSTGRES_ACCEPTANCE.md` now proves concurrent status/audit ordering, database-triggered audit rollback, missing incident behavior and durable reopening. Neither suite writes production.

Actual isolated PostgreSQL persistence/concurrency acceptance is complete. A controlled signed-in operator session is still required to verify UI acknowledgment and refresh. No production incident was acknowledged, resolved or materialized by this execution worker. A READY deployment and unauthenticated auth guard do not establish that full signed-in workflow.
