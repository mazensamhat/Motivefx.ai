# Bounded recovery for site asset failures

The site global error boundary recognizes webpack chunk-load errors and browser
dynamic-import failures. While online, it may reload the current page once per
browser tab. A session-storage marker is written and verified before reloading;
it is retained across errors, routes, and releases to prevent automatic loops.
Only that marker is added. Authentication cookies and existing application
storage are not cleared.

Offline failures show reconnect guidance without an automatic reload. Blocked or
unwritable session storage disables automatic recovery. If a missing file still
fails after the first reload, the page offers an explicit manual reload and says
that automatic retry has stopped. Unrelated errors retain React's reset action.
The UI does not assert that a network failure necessarily came from a deployment.

## Evidence and limits

- `apps/site/scripts/chunk-recovery.test.mjs` tests classification, one attempt,
  preserved storage, offline behavior, and unavailable/malformed guard storage.
- `tests/build-chunk-recovery-fixture.mjs` bundles the real error component into a
  local fixture. `tests/chunk-recovery-browser.py` exercises actual missing module
  responses, fresh load, recovery after reload, persistent failure, offline
  behavior, ordinary reset, blocked storage, and preserved cookies/storage.
- Fixture telemetry terminates in its local HTTP server. These tests do not write
  production telemetry or synthesize production incidents.

This is recovery coverage for [issue #147](https://github.com/mazensamhat/Motivefx.ai/issues/147),
not proof of its historical asset-level root cause. The original event has no
retained asset source frames. Production closure still requires release evidence,
the real `/demo` flow, and observation of the original signature after release.
The Terminal's separately reported runtime incidents are not closed by this fix.
