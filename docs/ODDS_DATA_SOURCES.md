# Sports odds data sources

MotiveFX uses **The Odds API** for the Bets / Line Movement board and **Polymarket Gamma** (free, no key) for Predictions. Polymarket paths never call The Odds API.

## What burns quota today (The Odds API)

| Factor | Behavior |
|--------|----------|
| Billing unit | 1 credit ≈ 1 sport × 1 region × 1 market (`h2h` + `us` = 1) |
| Free plan | ~500 credits / month |
| Callers | `/live-feed`, `/home/briefing`, `/betting/line-moves`, `/betting/market-activity`, advisor picks/analyze |
| Historical problem | No TTL cache + multi-sport fallback (up to ~8 sports) + LiveFeed every 15s |

**Polymarket** uses `https://gamma-api.polymarket.com` only — keep it that way.

## Mitigations shipped in-app

- **10-minute in-memory server cache** on `fetchLineMovesWithMeta` (shared board across routes)
- **Max 3 sports** per cache miss; requested league first (no `upcoming` stampede)
- **LiveFeed poll 5 min** (was 15s)
- **Gamma cache ~10 min** + Next `revalidate: 600`
- **Health** exposes `quota.the_odds_api.remaining` / `used` (`x-requests-remaining`); terminal status shows “Odds N left”

See `apps/site/src/lib/terminal/feeds/index.ts` and `/api/health`.

---

## Provider comparison (2026)

| Provider | Pricing snapshot | Quota model | Fit for MotiveFX |
|----------|------------------|-------------|------------------|
| **The Odds API** | Free 500 credits; paid from ~$30/mo (20k) → higher tiers | markets × regions per call | Current; OK if cached + capped |
| **API-Football / API-Sports** | Free ~100 req/day; paid from low tens $/mo | Request-based; odds as add-on endpoints | Good cheap **scores + odds** if you accept fewer books |
| **SportDevs** | Free tier + paid (check current site) | Sports-specific REST | Cheap multi-sport scores/odds; verify US books |
| **OddsJam** | Sales / enterprise | Sharp / +EV oriented | Overkill / expensive for a terminal ticker |
| **Betfair Exchange** | App key + delayed/live; UK/AU-centric | Exchange prices, not US soft books | Poor US retail UX; regulatory friction |
| **Scraping sportsbooks** | “Free” until blocked | Fragile, ToS/legal risk | **Discourage** — unstable, blockable, compliance risk |
| **Free delayed feeds** | Vendor-specific | Often 15–30+ min delay | Fine for “desk context,” not live betting UX |
| **Live only for subscribed betting module** | Product gating | Zero Odds calls for free users | Strong cost control once entitlements are enforced server-side |

Sources: [The Odds API](https://the-odds-api.com/), [API-Sports](https://api-sports.io/), public pricing pages (verify before purchasing).

---

## Recommended replacements (pick 1–2)

### 1. Stay on The Odds API + paid 20k tier (short term) — **recommended if caching is enough**

**Why:** Least code change; already integrated; $30/mo for 20k credits is enough once refreshes are cached and capped.

**Setup:**

1. Upgrade at [the-odds-api.com](https://the-odds-api.com/) to the 20k plan (or higher if you add more markets).
2. Keep `THE_ODDS_API_KEY` in Vercel env.
3. Confirm `/api/health` → `quota.the_odds_api.remaining` stays healthy after a day of terminal use.
4. Do **not** re-enable multi-market (`spreads,h2h`) or `upcoming`-first loops without raising the sport cap.

### 2. API-Football / API-Sports odds (cheaper long-term alternative) — **recommended if free-tier still dies**

**Why:** Lower entry price, request-based quotas, fixtures + odds in one vendor; good enough for a line board (fewer US books than The Odds API).

**Setup:**

1. Create an account at [api-sports.io](https://api-sports.io/) (or dashboard.api-football.com).
2. Subscribe to a plan that includes **odds** for the leagues you care about (MLB / NBA / NFL / NHL / MLS).
3. Set `API_SPORTS_KEY` (new) in Vercel.
4. Implement an adapter in `feeds/index.ts` parallel to `fetchOddsForSport` mapping fixtures → `LineMoveItem`.
5. Feature-flag: prefer API-Sports when Odds remaining &lt; threshold or key missing.
6. Keep Polymarket on Gamma unchanged.

### Optional product gate

Serve live Odds/API-Sports **only** when the user has the betting module entitlement (server-side check on `/betting/*` and omit odds from `/live-feed` / `/home/briefing` for everyone else). That cuts background quota burn to near zero for non-subscribers.

---

## What not to do

- Do not scrape DraftKings / FanDuel / etc.
- Do not wire Polymarket or `/crypto/prediction-odds` to The Odds API.
- Do not poll Odds more often than the server cache TTL.
- Do not treat Betfair as a drop-in US soft-book replacement without product/legal review.

---

## Next steps for ops

1. Watch `quota.the_odds_api.remaining` for a week after deploy.
2. If still burning: enable betting-module-only odds gating.
3. If free tier is chronically empty: upgrade Odds API **or** add API-Sports adapter (above).
4. Revisit SportDevs only if you need broader non-US coverage at lower cost than Odds API paid tiers.
