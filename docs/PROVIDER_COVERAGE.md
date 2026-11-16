# Provider coverage and customer promises

A source integration, a configured credential, a successful current observation,
and validated historical outcome coverage are different facts. The public source
catalog now describes integrations without declaring all providers live/configured.
Operational status and actual observation timestamps remain the current evidence.

| Area | Implemented behavior | Remaining prerequisite |
|---|---|---|
| Equity quotes/insider filings | Finnhub integration | Verify authorized coverage and fresh observations for supported symbols |
| Equity outcome validation | Completed historical-close policy; explicit capability gate | Authorized historical-candle access and usable historical observations |
| Crypto market data/outcomes | CoinStats/CoinGecko integration; supported-symbol historical evaluator | Verify per-symbol history and source freshness; unknown data stays unresolved |
| Sports odds | SharpAPI with alternative Odds API coverage | Current event/provider access; settlement outcomes remain unsupported by the existing evaluator |
| Prediction markets | Polymarket event, price and volume observations | Grounded settlement outcome integration; market prices are not calibrated MotiveFX forecasts |
| Bookmaker consensus | Derived comparison across available odds | Actual ticket counts/handle require a separate source; the derived indicator must not be named live money splits |
| Options flow | Demonstration coverage | Select authorized source coverage, implement its adapter, and verify timestamp/provenance/failure behavior |
| Congressional trades | Demonstration coverage | Select the disclosure source and reporting-delay contract; verify extraction, amendments and attribution |
| Dedicated OTC/microcap tape | Demonstration coverage | Authorized symbol/tape coverage and production truth acceptance |
| Motive Daily/background push | Backend foundations; inactive | Confirmed consent/device lifecycle, provider/receipt acceptance and explicit activation |

The Pro pricing card identifies in-app alerts as available and email/background
push as not yet active. Existing tier entitlements and prices are unchanged.

Motive Signal summarizes attributed evidence. Evidence confidence, observed
historical reliability and calibrated forecast probability are distinct. The
outcome pipeline retains `forecastReady: false`; overdue unsupported-market rows
must not be presented as evidence of a stalled supported-market evaluator or as
validated probability samples.

This checklist does not authorize new vendor spending, credential changes,
historical backfills, real outbound delivery or fabricated live-provider claims.
