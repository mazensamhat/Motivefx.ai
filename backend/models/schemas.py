from pydantic import BaseModel, Field


class StockHolding(BaseModel):
    symbol: str
    shares: float = Field(gt=0)
    avg_cost: float | None = None


class CryptoHolding(BaseModel):
    symbol: str
    amount: float = Field(gt=0)
    avg_cost: float | None = None


class PortfolioRequest(BaseModel):
    user_id: str = "demo"
    holdings: list[dict]


class BetEntry(BaseModel):
    user_id: str = "demo"
    matchup: str
    pick: str
    odds: str = ""
    stake: float = 0
    sport: str = "football"


class PredictionEntry(BaseModel):
    user_id: str = "demo"
    market: str
    category: str = "other"
    pick: str
    stake: float = 0
    yes_price: float | None = None


class Recommendation(BaseModel):
    symbol: str | None = None
    matchup: str | None = None
    action: str  # buy | sell | hold | fade | lean | pass
    confidence: int = Field(ge=0, le=100)
    headline: str
    reasoning: str
    signals: list[str] = []


class DeepScan(BaseModel):
    title: str = "AI DEEP SCAN"
    subject: str
    headline: str
    body: str
    conclusion: str
    verdict: str  # bullish | bearish | neutral
    confidence: int = Field(ge=0, le=100)
    action: str = "HOLD"


class NewsItem(BaseModel):
    id: str
    headline: str
    summary: str
    source: str
    category: str
    impact: str
    tags: list[str] = []
    timestamp: str = ""
    relevanceScore: int = 0
    relevanceReason: str = ""
    affectsYou: bool = False


class AdvisorResponse(BaseModel):
    module: str
    summary: str
    recommendations: list[Recommendation]
    picks: list[Recommendation] = []
    ai_narrative: str = ""
    deep_scans: list[DeepScan] = []
    portfolio_value: float | None = None
    news: list[NewsItem] = []
