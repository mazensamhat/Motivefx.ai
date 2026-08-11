# Sports odds data sources

MotiveFX uses **SharpAPI** as the primary sports odds provider for the Bets / Line Movement board, with **The Odds API** as backup. **Polymarket Gamma** (free, no key) powers Predictions and never calls Sharp or The Odds API.

## Provider order (line board)

1. **SharpAPI** (`SHARP_API_KEY`) — one `GET /odds?market=moneyline&limit=200` per cache miss; maps flat rows → `LineMoveItem`
2. On Sharp failure, empty board, or missing Sharp key → **The Odds API** (`THE_ODDS_API_KEY`) with shared slate cache + **max 4 sports** per refresh
3. If both unavailable → labeled **demo** sample lines (never unlabeled fake live data)

## Shared slate cache (5–15 min)

| Constant / env | Default | Notes |
|----------------|---------|--------|
| `ODDS_BOARD_CACHE_TTL_SEC` | **900** (15 min) | Clamp 300–900. Shared `board` key across `/betting/line-moves`, sharp-action, market-activity, live-feed, briefing |
| `POLYMARKET_CACHE_TTL_SEC` | **900** (15 min) | Clamp 300–900. Single `gamma:slate` key — callers slice to limit |
| Client poll (terminal) | 5 min | Does not force upstream refresh while server TTL is warm |

Exported helpers: `ODDS_CACHE_TTL_MS`, `POLYMARKET_CACHE_TTL_MS`, `getSlateCacheConfig()` (also on `/api/health` → `cache`).

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
| Callers | Same board routes; only hit when Sharp misses or selected sport is thin |
| Caps | Max **4** major sports per cache miss; early-stop on preferred coverage |
| Majors | NFL, NBA, MLB, NHL, MLS, MMA, WNBA (obscure soccer demoted) |

**Polymarket (primary)** uses `https://gamma-api.polymarket.com` only for the main Predictions board — keep that path free of Sharp / Odds keys.

**Bitquery (optional enrichment)** can add on-chain Polymarket sports/esports rows when `BITQUERY_API_KEY` is set. NBA/NFL/Esports title keywords run first. **Cricket is opt-in** (`BITQUERY_CRICKET=true`) and capped. It never replaces Gamma or SharpAPI. Bitquery cache TTL is **30 min**.

## Mitigations shipped in-app

- **15-minute in-memory server cache** on `fetchLineMovesWithMeta` / `fetchPredictionMarketsWithMeta` (shared board across routes; tunable 5–15)
- **Sharp first** (single request) then Odds backup with sport cap
- **LiveFeed / Bets / Predictions client poll 5 min**
- **Gamma shared slate** + `Cache-Control: s-maxage` on markets / line-moves
- **Health** exposes `quota.*` and `cache.*`; terminal prefers Sharp remaining

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
4. Confirm `/api/health` → `feeds.sharp_api: true`, `feeds.polymarket: true`, `cache.oddsBoardTtlSec` ≈ 900.
5. Confirm `/api/betting/line-moves` → `provider: "sharp_api"` when Sharp has games; `cacheTtlMs` present.
6. Confirm `/api/predictions/markets` → `provider: "polymarket_gamma"` (no Odds/Bitquery required).
7. Do **not** wire Polymarket to Sharp or The Odds API.
8. Optional: `ODDS_BOARD_CACHE_TTL_SEC=600` / `POLYMARKET_CACHE_TTL_SEC=600` for a faster 10-min slate.

## What not to do

- Do not scrape DraftKings / FanDuel / etc.
- Do not commit API keys to the MotiveFX repo (or paste them into tracked docs).
- Do not poll Odds more often than the server cache TTL.
- Do not serve fake Chiefs/Bills demo slips in the Public vs Sharp Money panel.
- Do not claim derived moneyline consensus is true public/sharp ticket splits — the UI labels it **Derived**.
- Do not enable Bitquery cricket unless you accept the points cost (`BITQUERY_CRICKET=true`).

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
| Role | **Optional** Predictions enrichment (NBA/NFL/esports; cricket opt-in) |
| Env | `BITQUERY_API_KEY` · optional `BITQUERY_ENABLED=false` · optional `BITQUERY_CRICKET=true` |
| Endpoint | `https://streaming.bitquery.io/graphql` |
| Signup | [account.bitquery.io](https://account.bitquery.io) — points-based; IDE tokens expire; production needs a paid/points plan for sustained use |
| Docs | [Polymarket Sports API](https://docs.bitquery.io/docs/examples/polymarket-api/polymarket-sports-api/) |
| Routes | Merged into `/api/predictions/markets` (max **2** enrichment rows) · probe `/api/predictions/bitquery-sports` · health `feeds.bitquery` |
| Cache | **30 min** TTL + stale-while-revalidate up to 2h |

Gamma stays primary. SharpAPI stays primary for the sports line board.
