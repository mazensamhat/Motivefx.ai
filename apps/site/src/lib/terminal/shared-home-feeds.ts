import { unstable_cache } from "next/cache";
import { fetchWhaleAlerts, fetchLineMoves, fetchPredictionMarkets, fetchCongressTrades, scanUnusualOptions, scanPennyMovers } from "./feeds";
import { getDataMode } from "./market-truth";
import { providerHealthFlags } from "./provider-switches";
import { isOpenPrediction } from "./data-quality";

async function bounded<T>(work:Promise<T>, empty:T, ms:number):Promise<T> {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([work,new Promise<T>(resolve=>{timer=setTimeout(()=>resolve(empty),ms);})]);}
  catch{return empty;}finally{if(timer)clearTimeout(timer);}
}
async function collect() {
  const [whales,lines,markets,congressTrades]=await Promise.all([
    bounded(fetchWhaleAlerts(),[],3500),bounded(fetchLineMoves(),[],3500),
    bounded(fetchPredictionMarkets(4),[],3500),bounded(fetchCongressTrades(10),[],2000),
  ]);
  const options=scanUnusualOptions().slice(0,4), penny=scanPennyMovers().slice(0,3);
  if(!whales.length&&!lines.length&&!markets.length&&!congressTrades.length&&!options.length&&!penny.length) throw Error("Shared market feeds unavailable");
  return {whales,lines,markets,congressTrades,options,penny,collectedAt:new Date().toISOString()};
}
// Public market data only. Account ids, portfolios, plans and preferences never enter this cache.
// Reuses the hosting Data Cache; no new service, scheduler or paid provider is introduced.
const cached = unstable_cache(async (_mode:string,_switches:string)=>collect(),["motivefx-shared-home-v1"],{revalidate:300});
let inflight:Promise<Awaited<ReturnType<typeof collect>>>|undefined;
let last:Awaited<ReturnType<typeof collect>>|undefined;
let lastKey="", checkedAt=0, retryAt=0;
function usable(value:Awaited<ReturnType<typeof collect>>) {
  return {...value,markets:value.markets.filter(market=>isOpenPrediction(market as unknown as Record<string,unknown>))};
}
export async function getSharedHomeFeeds() {
  const mode=getDataMode(), switches=JSON.stringify(providerHealthFlags()), key=mode+switches;
  if(key!==lastKey){last=undefined;inflight=undefined;lastKey=key;checkedAt=0;retryAt=0;}
  if(last&&Date.now()-checkedAt<30_000)return usable(last);
  if(Date.now()<retryAt){if(last)return usable(last);throw Error("Shared feeds cooling down");}
  if(inflight)return inflight.then(usable);
  const work=cached(mode,switches).then(value=>{
    if(lastKey===key){last=value;checkedAt=Date.now();}return value;
  }).catch(error=>{if(lastKey===key)retryAt=Date.now()+60_000;if(last&&lastKey===key)return last;throw error;})
    .finally(()=>{if(inflight===work)inflight=undefined;});
  inflight=work;return work.then(usable);
}
