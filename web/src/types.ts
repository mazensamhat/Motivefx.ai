export type TabId = "home" | "stocks" | "crypto" | "betting" | "penny" | "predictions";

export interface LiveEvent {
  type: "stock" | "crypto" | "betting" | "penny" | "predictions";
  severity: "high" | "medium" | "low";
  message: string;
  timestamp?: string;
}

export interface UnusualOption {
  symbol: string;
  type: string;
  strike?: number;
  expiry?: string;
  volume?: number;
  openInterest?: number;
  premium?: number;
  sentiment: string;
  note?: string;
}

export interface CongressTrade {
  politician: string;
  symbol: string;
  transaction: string;
  amount: string;
  filedAt?: string;
}

export interface WhaleAlert {
  asset: string;
  amountUsd: number;
  from: string;
  to: string;
  direction: string;
  note?: string;
}

export interface PredictionMarket {
  market: string;
  platform: string;
  yes: number;
  no: number;
  volume24h: string;
  category?: string;
  categoryLabel?: string;
  slug?: string;
  timestamp?: string;
}

export interface FeedStatus {
  finnhub: boolean;
  coinstats: boolean;
  sharp_api?: boolean;
  the_odds_api: boolean;
  polymarket?: boolean;
  stripe: boolean;
}

export interface OddsQuotaStatus {
  remaining: number | null;
  used: number | null;
  configured?: boolean;
}

export interface SharpQuotaStatus {
  remaining: number | null;
  limit?: number | null;
  reset?: number | null;
  dataDelay?: number | null;
  configured?: boolean;
}

export interface HealthPayload {
  feeds?: FeedStatus & Record<string, boolean>;
  quota?: {
    sharp_api?: SharpQuotaStatus;
    the_odds_api?: OddsQuotaStatus;
  };
}

export interface LineMove {
  matchup: string;
  sport: string;
  openingLine?: string;
  currentLine?: string;
  movement?: string;
  direction?: string;
  book?: string;
  commenceTime?: string;
  timestamp?: string;
}

export interface SharpAction {
  matchup: string;
  publicPct: number;
  moneyPct: number;
  sharpSide: string;
  signal: string;
  confidence: string;
}

export interface PennyMover {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  volRatio: number;
  sentiment: string;
  note?: string;
  timestamp?: string;
}

export interface StockActivity {
  id: string;
  symbol: string;
  actor: string;
  actorType: string;
  side: string;
  shares: number;
  amountUsd: number;
  price?: number;
  timestamp: string;
  note?: string;
}

export interface CryptoActivity {
  id: string;
  symbol: string;
  side: string;
  amountUsd: number;
  amountCrypto: number;
  from: string;
  to: string;
  venue: string;
  timestamp: string;
  note?: string;
}

export interface BetActivity {
  id: number;
  user_id: string;
  matchup: string;
  pick: string;
  odds: string;
  stake: number;
  status: string;
  created_at: string;
}

export interface Recommendation {
  symbol?: string;
  matchup?: string;
  action: string;
  confidence: number;
  headline: string;
  reasoning: string;
  signals: string[];
  /** Detailed score breakdown for Why? — preferred over raw signal tags. */
  reasons?: string[];
  riskLevel?: "low" | "medium" | "high" | "extreme";
}

export interface HomeOpportunity {
  id: string;
  module: string;
  symbol: string;
  title: string;
  confidence: number;
  expectedMove: string;
  riskLevel: string;
  stars: number;
  signals: string[];
  reasons: string[];
}

export interface HomeBriefing {
  greeting: string;
  tagline: string;
  motivfxScore: number;
  stars: number;
  marketConfidence: string;
  opportunityCount: number;
  highRiskAlerts: number;
  portfolioDelta?: number | null;
  biggestRisk: string;
  biggestOpportunity: string;
  topAiTip: string;
  moduleSummaries: Array<{ module: string; label: string; count: number; tab: string; newSignals?: number }>;
  opportunities: HomeOpportunity[];
  personalized?: HomePersonalized;
  sentiment: { reddit: string; x: string; news: string };
  breakingNewsCount: number;
  generatedAt: string;
  scenarioDisclaimer?: string;
  compareLens?: CompareLensItem[];
  audioBriefingScript?: string;
  moduleStories?: Record<string, string>;
  alertUnreadCount?: number;
}

export interface IntelAlert {
  id: number;
  module?: string | null;
  symbol?: string | null;
  title: string;
  body?: string | null;
  confidence?: number | null;
  seen: boolean;
  createdAt: string;
}

export interface HomePersonalized {
  holdingsCount: number;
  watchlistCount: number;
  radarSignalCount: number;
  coverageLine?: string | null;
  intelNote?: string;
  simRecord?: string | null;
  radarHits?: Array<{ id: string; symbol: string; title: string; module: string; confidence: number }>;
}

export interface WatchlistItem {
  module: string;
  symbol: string;
  createdAt: string;
}

export interface CompareLensItem {
  id: string;
  symbol: string;
  module: string;
  title: string;
  currentConfidence: number;
  priorConfidence: number;
  deltaLabel: string;
  context: string;
}

export interface IntelJournalEntry {
  id: number;
  module?: string | null;
  symbol?: string | null;
  signalTitle?: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeepScan {
  title: string;
  subject: string;
  headline: string;
  body: string;
  conclusion: string;
  verdict: "bullish" | "bearish" | "neutral";
  confidence: number;
  action: string;
}

export interface AdvisorResult {
  summary: string;
  recommendations: Recommendation[];
  picks?: Recommendation[];
  ai_narrative?: string;
  deep_scans?: DeepScan[];
  portfolio_value?: number;
  news?: NewsItem[];
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  impact: string;
  tags?: string[];
  timestamp: string;
  relevanceScore: number;
  relevanceReason: string;
  affectsYou: boolean;
}
