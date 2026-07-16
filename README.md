# MotiveFX.AI

**Unified Prediction & Smart Money Tracker** — stocks, crypto, and sports betting intelligence in one live dashboard.

Pure SaaS. No trading. No betting. Just intelligence.

## Architecture

```
motivefx-ai/
├── apps/site/   Next.js — production site, billing, terminal APIs (Vercel)
├── packages/database/  Prisma + Postgres (Supabase)
├── web/         React + Vite terminal (embedded at /terminal/)
└── mobile/      Expo React Native app (iOS + Android)
```

Production runs entirely on **Vercel + Supabase + Stripe**. Market feeds and advisor logic live in native Next.js API routes under `apps/site/src/app/api/*`.

## Quick Start (local)

```powershell
cd C:\Users\Mazen\Documents\motivefx-ai
npx pnpm@9.15.0 install
# Copy apps/site/.env.local.example → apps/site/.env.local
# Copy packages/database/.env.example → packages/database/.env
npx pnpm@9.15.0 db:generate
npx pnpm@9.15.0 db:push
npx pnpm@9.15.0 dev
```

Open http://localhost:3010 — terminal at http://localhost:3010/terminal/

## Intelligence tiers

| Plan | Markets | Highlights |
|------|---------|------------|
| Lite | Pick 1 | AI Brief, limited research briefs |
| Pro | Pick 2 | Portfolio Intelligence, AI Memory, push + Motive Daily email |
| Ultra | All 5 | Voice briefing, Decision History, advanced analytics |
| Ultra+ | All 5 | Everything in Ultra + API, teams, multi-portfolio, concierge |
| Elite | All 5 | Annual VIP — white-glove onboarding, early AI models |

See `/pricing` on the site for current Stripe pricing. Ultra vs Ultra+ differs on **API / teams / multi-portfolio / beta / concierge** — not market count.

Public preview (no login): `/demo` → `/terminal/?demo=1`

## API routes (native)

- `GET /api/home/briefing` — personalized intel briefing
- `POST /api/advisor/*/analyze` — portfolio AI per market
- `GET /api/stocks|crypto|betting|penny|predictions/*` — live feeds
- `POST /api/billing/checkout` — Stripe checkout
- `GET /api/health` — feed key status

## Data feeds

| Tab | Provider | Env var |
|-----|----------|---------|
| Stocks | Finnhub | `FINNHUB_API_KEY` |
| Crypto | CoinStats (+ CoinGecko fallback) | `COINSTATS_API_KEY` |
| Betting | SharpAPI (primary) + The Odds API (backup) | `SHARP_API_KEY`, `THE_ODDS_API_KEY` |
| Predictions | Polymarket Gamma | (public) |
| AI briefs | OpenAI | `OPENAI_API_KEY` |

**Demo / simulated** (labeled on `/data-sources`): unusual options flow, congress trades, sharp-money splits, pink-sheet scanner samples.

Without API keys the app runs in **demo mode** with realistic sample data.

## Deploy

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for Vercel + Supabase + Stripe production setup.

## Legal

MotiveFX.AI is an **information and analytics provider**. It does not execute trades, accept bets, or hold user funds.
