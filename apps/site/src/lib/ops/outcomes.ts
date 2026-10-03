/** Market-grounded outcome evaluation. Motive Signal is never treated as a forecast probability. */
import { prisma } from "@motivefx/database";
import {
  DAY_MS,
  OUTCOME_EVALUATOR_VERSION,
  OUTCOME_SEED_VERSIONS,
  RETRYABLE_OUTCOME_PREFIX,
  classifyObservedReturn,
  outcomeDueAt,
  selectCompletedDailyClose,
  summarizeCalibration,
  type ObservedDailyClose,
} from "./outcome-policy";

const RETRY_AFTER_MS = 60 * 60 * 1000;
const BATCH_BUDGET_MS = 35_000;
const LEGACY_MISSING_DATA_NOTE = "Observed historical market price unavailable or provider capability disabled; excluded from calibration";
const COINGECKO_IDS: Record<string,string> = {
  BTC:"bitcoin", ETH:"ethereum", USDT:"tether", USDC:"usd-coin", SOL:"solana",
  XRP:"ripple", DOGE:"dogecoin", ADA:"cardano", BNB:"binancecoin",
  AVAX:"avalanche-2", DOT:"polkadot", LINK:"chainlink", LTC:"litecoin",
};
type OutcomeMarket = "stocks"|"penny"|"crypto"|"sports"|"predictions"|"unknown";

function stockHistoryEnabled(): boolean {
  return process.env.FINNHUB_HISTORICAL_ENABLED === "true" && Boolean(process.env.FINNHUB_API_KEY?.trim());
}
function cryptoHistoryEnabled(): boolean {
  return process.env.COINGECKO_OUTCOMES_ENABLED !== "false";
}
function parseEvidence(raw: string): Array<Record<string,unknown>> {
  try {
    const value=JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((v):v is Record<string,unknown> => Boolean(v)&&typeof v==="object"&&!Array.isArray(v)) : [];
  } catch { return []; }
}
function inferOutcomeMarket(snapshot: { evidenceJson: string; symbol: string }): OutcomeMarket {
  const evidence=parseEvidence(snapshot.evidenceJson);
  for(const ev of evidence){
    const id=typeof ev.id==="string" ? ev.id.toLowerCase() : "";
    if(id.startsWith("opp-crypto-")) return "crypto";
    if(id.startsWith("opp-betting-")) return "sports";
    if(id.startsWith("opp-pred-")) return "predictions";
    if(id.startsWith("opp-penny-")) return "penny";
    if(id.startsWith("opp-stock-")||id.startsWith("opp-trades-")) return "stocks";
  }
  for(const ev of evidence){
    const market=typeof ev.market==="string" ? ev.market.toLowerCase() : "";
    if(market==="crypto"||market==="sports"||market==="predictions"||market==="stocks") return market as OutcomeMarket;
  }
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(snapshot.symbol) ? "stocks" : "unknown";
}
function historicalCapability(market: OutcomeMarket): boolean {
  if(market==="stocks"||market==="penny") return stockHistoryEnabled();
  if(market==="crypto") return cryptoHistoryEnabled();
  return false;
}
function isoDay(atMs:number){
  const d=new Date(atMs);
  return `${String(d.getUTCDate()).padStart(2,"0")}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${d.getUTCFullYear()}`;
}
const observedCache=new Map<string,{expires:number,promise:Promise<ObservedDailyClose|null>}>();
function cached(key:string, work:()=>Promise<ObservedDailyClose|null>){
  const now=Date.now(), hit=observedCache.get(key);
  if(hit&&hit.expires>now) return hit.promise;
  const promise=work();
  observedCache.set(key,{expires:now+30*60*1000,promise});
  if(observedCache.size>800) observedCache.delete(observedCache.keys().next().value as string);
  return promise;
}
async function fetchStockClose(symbol:string, atMs:number):Promise<ObservedDailyClose|null>{
  if(!stockHistoryEnabled()) return null;
  const key=process.env.FINNHUB_API_KEY!.trim();
  const from=Math.floor((atMs-5*DAY_MS)/1000), to=Math.floor(atMs/1000);
  return cached(`stock:${symbol}:${Math.floor(atMs/DAY_MS)}`,async()=>{
    try{
      const res=await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(key)}`,
        {cache:"no-store",signal:AbortSignal.timeout(5_000)});
      if(!res.ok) return null;
      return selectCompletedDailyClose(await res.json(),atMs);
    }catch{return null;}
  });
}
async function fetchCryptoClose(symbol:string, atMs:number):Promise<ObservedDailyClose|null>{
  if(!cryptoHistoryEnabled()) return null;
  const coin=COINGECKO_IDS[symbol.toUpperCase()];
  if(!coin) return null;
  const completedAt=atMs-DAY_MS;
  const date=isoDay(completedAt);
  return cached(`crypto:${coin}:${date}`,async()=>{
    try{
      const res=await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coin)}/history?date=${date}&localization=false`,
        {cache:"no-store",headers:{accept:"application/json"},signal:AbortSignal.timeout(7_000)});
      if(!res.ok) return null;
      const data=await res.json() as {market_data?:{current_price?:{usd?:unknown}}};
      const price=data.market_data?.current_price?.usd;
      if(typeof price!=="number"||!Number.isFinite(price)||price<=0) return null;
      const d=new Date(completedAt);
      const barAtMs=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
      const availableAtMs=barAtMs+DAY_MS;
      return availableAtMs<=atMs ? {price,barAtMs,availableAtMs} : null;
    }catch{return null;}
  });
}
async function fetchObservedClose(market:OutcomeMarket,symbol:string,atMs:number){
  if(market==="crypto") return fetchCryptoClose(symbol,atMs);
  if(market==="stocks"||market==="penny") return fetchStockClose(symbol,atMs);
  return null;
}
function providerLabel(market:OutcomeMarket){
  return market==="crypto" ? "CoinGecko historical USD daily snapshot" : market==="stocks"||market==="penny" ? "Finnhub completed daily close" : "unsupported";
}

export async function evaluatePendingOutcomes(limit=100):Promise<{evaluated:number;inconclusive:number}>{
  const started=Date.now();let evaluated=0,inconclusive=0;
  // No historical provider capability means there is nothing safe to evaluate.
  // Leave pending observations untouched and avoid an unnecessary database checkout.
  if(!stockHistoryEnabled()&&!cryptoHistoryEnabled()) return {evaluated,inconclusive};
  // Provider observations are shared only within one evaluation batch. A later
  // run must revalidate availability rather than inheriting a prior request's cache.
  observedCache.clear();
  const take=Number.isFinite(limit)?Math.min(250,Math.max(1,Math.floor(limit))):100;
  try{
    const pending=await prisma.signalOutcome.findMany({
      where:{
        evaluatorVersion:{in:OUTCOME_SEED_VERSIONS},
        OR:[
          {outcome:"PENDING"},
          {outcome:"INCONCLUSIVE",evaluatedAt:{lte:new Date(started-RETRY_AFTER_MS)},OR:[
            {notes:{startsWith:RETRYABLE_OUTCOME_PREFIX}},
            {notes:LEGACY_MISSING_DATA_NOTE},
          ]},
        ],
      },
      include:{snapshot:true},take,orderBy:{createdAt:"asc"},
    });
    for(const row of pending){
      if(Date.now()-started>=BATCH_BUDGET_MS) break;
      const market=inferOutcomeMarket({ ...row.snapshot, symbol: row.snapshot.symbol ?? row.symbol });
      if(!historicalCapability(market)){continue;}
      const entryAt=row.snapshot.recordedAt.getTime();
      const dueAt=outcomeDueAt(entryAt,row.horizonDays);
      if(dueAt!=null&&dueAt>Date.now()) continue;
      const score=row.predictedScore;
      const where={id:row.id,outcome:row.outcome,evaluatorVersion:row.evaluatorVersion};
      try{
        if(dueAt==null||score==null||!Number.isFinite(score)||score<0||score>100){
          const changed=await prisma.signalOutcome.updateMany({where,data:{
            outcome:"INCONCLUSIVE",evaluatorVersion:OUTCOME_EVALUATOR_VERSION,evaluatedAt:new Date(),
            entryPrice:null,outcomePrice:null,realizedReturnPct:null,
            notes:"Invalid frozen prediction timestamp, horizon, or Motive Signal score; excluded from calibration",
          }});
          inconclusive+=changed.count;continue;
        }
        const [entry,exit]=await Promise.all([
          fetchObservedClose(market,row.symbol,entryAt),
          fetchObservedClose(market,row.symbol,dueAt),
        ]);
        const result=entry&&exit?classifyObservedReturn(score,entry.price,exit.price):null;
        if(!entry||!exit||!result){
          const changed=await prisma.signalOutcome.updateMany({where,data:{
            outcome:"INCONCLUSIVE",evaluatorVersion:OUTCOME_EVALUATOR_VERSION,evaluatedAt:new Date(),
            entryPrice:entry?.price??null,outcomePrice:exit?.price??null,realizedReturnPct:null,
            notes:`${RETRYABLE_OUTCOME_PREFIX}${providerLabel(market)} unavailable for ${market}; excluded from calibration and eligible for retry after one hour`,
          }});
          inconclusive+=changed.count;continue;
        }
        const changed=await prisma.signalOutcome.updateMany({where,data:{
          ...result,evaluatorVersion:OUTCOME_EVALUATOR_VERSION,evaluatedAt:new Date(),
          entryPrice:entry.price,outcomePrice:exit.price,
          notes:`${providerLabel(market)} proxy (not execution prices): ${entry.price.toFixed(6)} → ${exit.price.toFixed(6)} (${result.realizedReturnPct.toFixed(2)}%); market=${market}; entry ${new Date(entry.barAtMs).toISOString()}, outcome ${new Date(exit.barAtMs).toISOString()}`,
        }});
        evaluated+=changed.count;
      }catch{console.warn("[ops/outcomes] row evaluation failed; retained for retry");}
    }
  }catch{console.warn("[ops/outcomes] evaluation store unavailable");}
  return {evaluated,inconclusive};
}

export async function buildCalibrationFromOutcomes(){
  const batch=await evaluatePendingOutcomes(160);
  try{
    const [rows,pendingCount,inconclusiveCount,coverage]=await Promise.all([
      prisma.signalOutcome.findMany({
        where:{evaluatorVersion:OUTCOME_EVALUATOR_VERSION,outcome:{in:["CONFIRMED","PARTIAL","REJECTED"]}},
        select:{predictedConf:true,outcome:true},take:5000,orderBy:{evaluatedAt:"desc"},
      }),
      prisma.signalOutcome.count({where:{outcome:"PENDING",evaluatorVersion:{in:OUTCOME_SEED_VERSIONS}}}),
      prisma.signalOutcome.count({where:{outcome:"INCONCLUSIVE",evaluatorVersion:OUTCOME_EVALUATOR_VERSION}}),
      prisma.signalOutcome.findMany({
        where:{evaluatorVersion:{in:OUTCOME_SEED_VERSIONS},outcome:"PENDING"},
        include:{snapshot:{select:{symbol:true,evidenceJson:true}}},take:1000,
      }),
    ]);
    const summary=summarizeCalibration(rows);
    const byMarket:Record<string,number>={stocks:0,penny:0,crypto:0,sports:0,predictions:0,unknown:0};
    for(const row of coverage) byMarket[inferOutcomeMarket({ ...row.snapshot, symbol: row.snapshot.symbol ?? row.symbol })]+=1;
    const note=summary.evaluated===0
      ?"No V4 market-grounded evaluated outcomes yet. Forecast probability remains unavailable."
      :`Calibration uses ${summary.evaluated} V4 market-grounded outcome(s); ${pendingCount} pending; ${inconclusiveCount} inconclusive. Unsupported or not-yet-due pending outcomes are preserved.`;
    return {...summary,note,evaluatorVersion:OUTCOME_EVALUATOR_VERSION,
      historicalDataEnabled:stockHistoryEnabled() || cryptoHistoryEnabled(),
      providerCapabilities:{stocks:stockHistoryEnabled(),crypto:cryptoHistoryEnabled()},
      supportedMarkets:["stocks","penny","crypto"],unsupportedMarkets:["sports","predictions"],
      pending:pendingCount,inconclusive:inconclusiveCount,pendingCoverageSample:byMarket,lastBatch:batch};
  }catch{
    return {...summarizeCalibration([]),note:"Outcome store unavailable.",evaluatorVersion:OUTCOME_EVALUATOR_VERSION,
      historicalDataEnabled:stockHistoryEnabled() || cryptoHistoryEnabled(),
      providerCapabilities:{stocks:stockHistoryEnabled(),crypto:cryptoHistoryEnabled()},
      supportedMarkets:["stocks","penny","crypto"],unsupportedMarkets:["sports","predictions"],
      pending:0,inconclusive:0,pendingCoverageSample:{},lastBatch:batch};
  }
}
