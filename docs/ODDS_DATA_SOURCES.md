# Sports odds data sources

MotiveFX uses **SharpAPI** as the primary sports odds provider for the Bets / Line Movement board, with **The Odds API** as backup. **Polymarket Gamma** (free, no key) powers Predictions and never calls Sharp or The Odds API.

## Provider order (line board)

1. **SharpAPI** (`SHARP_API_KEY`) — one `GET /odds?market=moneyline&limit=200` per cache miss; maps flat rows → `LineMoveItem`
2. On Sharp failure, empty board, or missing Sharp key → **The Odds API** (`THE_ODDS_API_KEY`) with existing 10-min cache + max 3 sports
3. If both unavailable → labeled **demo** sample lines (never unlabeled fake live data)

## SharpAPI (primary)

| Factor | Behavior |
|--------|----------|
| Auth | `X-API-Key: sk_live_…` (also Bearer / query for SSE) |
| Base URL | `https://api.sharpapi.io/api/v1` (override with `SHARP_API_BASE_URL`) |
| Free tier | **12 req/min**, 2 books (DK/FD), **60s data delay** |
| Hobby | **$79/mo**, 120 req/min, real-time, more books |
| Signup | [sharpapi.io/sign-up](https://sharpapi.io/sign-up) · docs: [docs.sharpapi.io](https://docs.sharpapi.io/en/) |
| Health | `feeds.sharp_api` + `quota.sharp_api.remaining` (`X-RateLimit-Remaining`) |

**Gotchas:** Free tier is delayed 60s and limited to DraftKings + FanDuel. Rate limit is per-minute (not monthly credits). Do not put `SHARP_API_KEY` in git — Vercel env only.

## The Odds API (backup)

| Factor | Behavior |
|--------|----------|
| Billing unit | 1 credit ≈ 1 sport × 1 region × 1 market (`h2h` + `us` = 1) |
| Free plan | ~500 credits / month |
| Callers | Same board routes; only hit when Sharp misses |
| Caps | Max **3 sports** per cache miss; **10-min** shared server cache |

**Polymarket (primary)** uses `https://gamma-api.polymarket.com` only for the main Predictions board — keep that path free of Sharp / Odds keys.

**Bitquery (optional enrichment)** can add on-chain Polymarket sports/esports rows (cricket via `ResolutionSource`, NBA/NFL/Esports via `Question.Title`) when `BITQUERY_API_KEY` is set. It never replaces Gamma or SharpAPI.

## Mitigations shipped in-app

- **10-minute in-memory server cache** on `fetchLineMovesWithMeta` (shared board across routes)
- **Sharp first** (single request) then Odds backup with sport cap
- **LiveFeed poll 5 min**
- **Gamma cache ~10 min** + Next `revalidate: 600`
- **Health** exposes `quota.sharp_api` and `quota.the_odds_api` separately; terminal prefers Sharp remaining

See `apps/site/src/lib/terminal/feeds/index.ts` and `/api/health`.

---

## Provider comparison (2026)

| Provider | Pricing snapshot | Quota model | Fit for MotiveFX |
|----------|------------------|-------------|------------------|
| **SharpAPI** | Free 12 req/min; Hobby $79 (real-time) | Request/min | **Primary** line board |
| **The Odds API** | Free 500 credits; paid from ~$30/mo (20k) | markets × regions per call | **Backup** when Sharp empty/fails |
| **API-Football / API-Sports** | Free ~100 req/day; paid from low tens $/mo | Request-based | Optional tertiary |
| **OddsJam** | Sales / enterprise | Sharp / +EV oriented | Overkill for ticker |
| **Scraping sportsbooks** | “Free” until blocked | Fragile | **Discourage** |

Sources: [SharpAPI](https://sharpapi.io/), [The Odds API](https://the-odds-api.com/), public pricing pages (verify before purchasing).

---

## Ops setup

1. Create a free key at [sharpapi.io/sign-up](https://sharpapi.io/sign-up).
2. Set `SHARP_API_KEY` in **Vercel** (Production + Preview). Never commit the key.
3. Keep `THE_ODDS_API_KEY` as backup.
4. Confirm `/api/health` → `feeds.sharp_api: true` and `quota.sharp_api.remaining`.
5. Confirm `/api/betting/line-moves` → `provider: "sharp_api"` when Sharp has games.
6. Do **not** wire Polymarket to Sharp or The Odds API.

## What not to do

- Do not scrape DraftKings / FanDuel / etc.
- Do not commit API keys to the MotiveFX repo (or paste them into tracked docs).
- Do not poll Odds more often than the server cache TTL.
- Do not serve fake Chiefs/Bills demo slips in the Public vs Sharp Money panel.
- Do not claim derived moneyline consensus is true public/sharp ticket splits — the UI labels it **Derived**.

---

## Public vs Sharp Money (derived)

MotiveFX does **not** have a ticket-split vendor. Instead, `/api/betting/sharp-action` derives a lean from live moneylines:

1. Prefer SharpAPI multi-book rows: soft books (DK/FD/…) vs sharp books (Pinnacle/Circa/…) when both exist
2. Else consensus favorite from the line board (`line` map) — fade heavy favorites as a low-confidence derived lean
3. Always returns `derivedNote` explaining the heuristic

Unlock: `SHARP_API_KEY` (best) or `THE_ODDS_API_KEY` (backup). Without either, the panel shows the next-step empty state.

---

## Bitquery sports / prediction enrichment

| Factor | Behavior |
|--------|----------|
| Role | **Optional** Predictions enrichment (cricket, NBA, NFL, esports-style Polymarket markets on Polygon) |
| Env | `BITQUERY_API_KEY` (Bearer token) · optional `BITQUERY_ENABLED=false` to disable |
| Endpoint | `https://streaming.bitquery.io/graphql` |
| Signup | [account.bitquery.io](https://account.bitquery.io) — points-based; IDE tokens expire; production needs a paid/points plan for sustained use |
| Docs | [Polymarket Sports API](https://docs.bitquery.io/docs/examples/polymarket-api/polymarket-sports-api/) |
| Routes | Merged into `/api/predictions/markets` · probe `/api/predictions/bitquery-sports` · health `feeds.bitquery` |

Gamma stays primary. SharpAPI stays primary for the sports line board.
