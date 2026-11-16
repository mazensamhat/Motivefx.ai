# Reading outcome readiness safely

Calibration views and `GET /api/admin/outcomes` only read the outcome store. They
do not call market providers or evaluate, retry, or rewrite outcomes. Evaluation
remains explicit in the credential-protected scheduled route (one batch of up to
160) and authenticated admin POST (one batch of up to 100).

## Interpreting the response

- `pendingByVersion` contains exact pending counts grouped by evaluator version.
  Legacy V1/V2 rows are not reported as V4 backlog or V4 calibration observations.
- `pendingEligibilitySample` reads at most 250 oldest pending rows from each
  supported seed version. Its readiness counts are **sample counts**, not global
  backlog counts. `truncated` indicates that pending rows remain outside the sample.
- A horizon starts at the frozen `SignalSnapshot.recordedAt`, not the later
  `SignalOutcome.createdAt`. Reaching that horizon does not establish an outcome.
- Readiness distinguishes invalid frozen predictions, future horizons, unverified
  market provenance, unsupported markets, disabled historical providers, unsupported
  crypto symbols, and rows ready for a historical provider check. It does not fetch
  prices or claim they exist. Sports and prediction-market settlement are currently
  unsupported by this evaluator.
- A successful empty read returns zero counts. An unavailable store returns
  `availability: "unavailable"` with null counts and eligibility, so a failed read
  cannot appear to prove an empty backlog.
- `lastBatch` is populated only when an explicit evaluator caller supplies the
  result of its single batch. A normal calibration read returns `null`.

Forecast probability remains unavailable. Readiness and calibration summaries do
not change evaluation policy, synthesize outcomes, rewrite historical observations,
or establish held-out predictive validity.

## Verification

```sh
node --experimental-strip-types --test \
  apps/site/scripts/outcome-policy.test.mjs \
  apps/site/scripts/outcome-service.test.mjs \
  apps/site/scripts/outcome-routes.test.mjs \
  tests/outcome-lifecycle.test.mjs
```

These tests use controlled provider, database, and auth doubles. They verify
snapshot-horizon boundaries, per-version sampling, unavailable-versus-empty
semantics, zero writes/provider calls on reads, one explicit batch per authorized
mutation route, authorization rejection before work, and the existing evaluator's
ground-truth and fairness behavior.
