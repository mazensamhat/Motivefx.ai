# MotiveFX.AI

**Unified Prediction & Smart Money Tracker** — stocks, crypto, and sports betting intelligence in one live dashboard.

Pure SaaS. No trading. No betting. Just intelligence.

## Port isolation (MotiveIQ vs MotiveFX)

These projects run side-by-side with **separate ports** — no shared processes or URLs.

| Service | MotiveIQ | MotiveFX.AI |
|---------|----------|-------------|
| Web dashboard | http://127.0.0.1:**5173** | http://127.0.0.1:**5280** |
| Backend API | http://127.0.0.1:**8000** | http://127.0.0.1:**8001** |

Both can run at the same time without conflict.

## Architecture

```
motivefx-ai/
├── backend/     FastAPI — aggregates Finnhub, CoinStats, The Odds API
├── web/         React + Vite dashboard (primary MVP surface)
└── mobile/      Expo React Native app (iOS + Android)
```

## Modular subscriptions

Subscribe à la carte — each module is **$29/mo** with a 3-day trial, or **$69/mo** for all three:

| Module | What you get |
|--------|----------------|
| **Trades** | Portfolio AI (buy/sell/hold), unusual options (yfinance), Senate congress disclosures |
| **Crypto** | Portfolio AI, CoinGecko trending, Polymarket odds, whale alerts |
| **Betting** | Bet tracker + AI grader, sharp/public picks, line movement |

### AI Advisor endpoints

- `POST /api/advisor/trades/analyze` — portfolio + free signal fusion
- `POST /api/advisor/crypto/analyze` — crypto holdings + trending/Polymarket
- `POST /api/advisor/betting/analyze` — grade your bets vs sharp money
- `GET /api/advisor/betting/picks` — top AI picks today

Free data sources wired in: **yfinance**, **Senate EFTS**, **Polymarket Gamma**, **CoinGecko**, **The Odds API** (when key set).

## MVP Roadmap

| Week | Goal |
|------|------|
| 1 | Sign up for API keys → paste into `.env` |
| 2–3 | Polish dashboard UI, alert preferences |
| 4 | Stripe billing + 3-day free trial |

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy ..\.env.example ..\.env  # add API keys when ready
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

API docs: http://127.0.0.1:8001/docs

### 2. Web Dashboard

```bash
cd web
npm install
npm run dev
```

Open http://127.0.0.1:5280

### 3. Mobile (optional)

```bash
cd mobile
npm install
npx expo start
```

## Data Feeds (Week 1)

| Tab | Provider | Env var | What you get |
|-----|----------|---------|--------------|
| Stocks | [Finnhub](https://finnhub.io) | `FINNHUB_API_KEY` | Unusual options, congress trades |
| Crypto | [CoinStats](https://coinstats.app/api) | `COINSTATS_API_KEY` | Whale wallet alerts |
| Betting | [The Odds API](https://the-odds-api.com) | `THE_ODDS_API_KEY` | Line movement across books |

Without API keys the app runs in **demo mode** with realistic sample data.

## Pricing Tiers

- **Basic** — $29/mo — Full dashboard access
- **Alpha** — $99/mo — Instant push alerts (Stripe + FCM/APNs in Week 4)

## Legal Position

MotiveFX.AI is an **information and analytics provider**. It does not execute trades, accept bets, or hold user funds. No broker-dealer or sports betting license required.

## Stripe Setup (Week 4)

1. Create products in Stripe Dashboard (Basic $29, Alpha $99)
2. Copy price IDs to `.env` (`STRIPE_PRICE_BASIC`, `STRIPE_PRICE_ALPHA`)
3. Set webhook endpoint to `POST /api/billing/webhook`
