"""Social-proof signal stories for conversion hooks — intel framing, not P&L claims."""

import random

CITIES = ["Austin", "Miami", "Chicago", "Denver", "Seattle", "Boston", "Dallas", "Phoenix", "Atlanta", "NYC"]

SIGNAL_TEMPLATES: dict[str, list[dict]] = {
    "trades": [
        {"signal": "NVDA options flow", "detail": "flagged 4 min before earnings headline", "timeAgo": "4 min ago"},
        {"signal": "AAPL block trade", "detail": "unusual call volume caught by Trades desk", "timeAgo": "11 min ago"},
        {"signal": "MSFT congress signal", "detail": "Senate disclosure cross-referenced with flow", "timeAgo": "22 min ago"},
    ],
    "penny": [
        {"signal": "SNDL volume spike", "detail": "Pink Slips scanner flagged 3.2x average volume", "timeAgo": "7 min ago"},
        {"signal": "AMC meme reload", "detail": "institutional block detected on Pink Slips feed", "timeAgo": "15 min ago"},
        {"signal": "BNGO catalyst watch", "detail": "microcap desk noted FDA headline correlation", "timeAgo": "31 min ago"},
    ],
    "crypto": [
        {"signal": "BTC whale transfer", "detail": "$48M exchange outflow logged on-chain", "timeAgo": "3 min ago"},
        {"signal": "ETH L2 rotation", "detail": "whale wallet pattern matched historical volatility", "timeAgo": "9 min ago"},
        {"signal": "SOL accumulation", "detail": "large wallet cluster flagged by Crypto desk", "timeAgo": "18 min ago"},
    ],
    "betting": [
        {"signal": "Chiefs @ Bills line move", "detail": "sharp side detected before public money shift", "timeAgo": "2 min ago"},
        {"signal": "Lakers @ Celtics injury", "detail": "line moved 1.5 pts within 8 minutes of report", "timeAgo": "8 min ago"},
        {"signal": "Dodgers @ Padres scratch", "detail": "pitcher news correlated with steam move", "timeAgo": "14 min ago"},
    ],
    "predictions": [
        {"signal": "Ceasefire contract", "detail": "Polymarket odds shift flagged on Predictions desk", "timeAgo": "5 min ago"},
        {"signal": "Fed rate-cut market", "detail": "YES price moved 6 pts on macro headline", "timeAgo": "12 min ago"},
        {"signal": "BTC $150K event", "detail": "24h volume spike on event contract", "timeAgo": "27 min ago"},
    ],
    "bundle": [
        {"signal": "Multi-desk alert", "detail": "NVDA flow + BTC whale + Bills line all flagged same hour", "timeAgo": "1 min ago"},
    ],
}


def random_win(module: str) -> dict:
    key = module if module in SIGNAL_TEMPLATES else "trades"
    template = random.choice(SIGNAL_TEMPLATES[key])
    city = random.choice(CITIES)
    signal = template["signal"]
    detail = template["detail"]
    return {
        "module": key,
        "city": city,
        "amount": 0,
        "amountFormatted": "",
        "signal": signal,
        "detail": detail,
        "timeAgo": template["timeAgo"],
        "headline": f"Signal flagged in {city} · {template['timeAgo']}",
    }
