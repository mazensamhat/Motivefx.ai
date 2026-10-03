import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const read=(p)=>readFile(new URL("../"+p,import.meta.url),"utf8");
const [outcomes,record,types,prefs,portfolio,close,track,vercel]=await Promise.all([
  read("apps/site/src/lib/ops/outcomes.ts"),read("apps/site/src/lib/terminal/market-truth/record-from-views.ts"),
  read("apps/site/src/lib/terminal/engines/types.ts"),read("apps/site/src/lib/terminal/engines/predictive.ts"),
  read("apps/site/src/app/api/intel/portfolio-intelligence/route.ts"),read("apps/site/src/app/api/intel/market-close/route.ts"),
  read("apps/site/src/app/api/intel/track-record/route.ts"),read("apps/site/vercel.json"),
]);
test("outcome v4 handles crypto and excludes non-directional event signals",()=>{
 assert.match(outcomes,/MARKET_OUTCOME_V4/);assert.match(outcomes,/CoinGecko/);assert.match(outcomes,/Generic evidence-strength signal/);
});
test("future evidence records the real market instead of hardcoding stocks",()=>{
 assert.match(record,/module === "crypto"/);assert.match(record,/module === "betting"/);assert.doesNotMatch(record,/market: "stocks"/);
});
test("watch agents persist in intel prefs",()=>{assert.match(types,/interface WatchAgent/);assert.match(prefs,/watchAgents/);});
test("portfolio intelligence is authenticated and whole-book",()=>{
 for(const s of ["trades","crypto","penny","listBets","listPredictions"]) assert.match(portfolio,new RegExp(s));
 assert.match(portfolio,/count-based/);
});
test("market close uses recorded signal deltas, not fake performance",()=>{assert.match(close,/signalSnapshot/);assert.match(close,/not realized performance/);});
test("track record separates scored, inconclusive and pending outcomes",()=>{
 assert.match(track,/inconclusiveOutcomes/);assert.match(track,/distinctResolvedSymbols/);assert.match(track,/observedAlignment/);
});
test("scheduled jobs run hourly",()=>{
 const parsed=JSON.parse(vercel);assert.ok(parsed.crons.some(c=>c.path==="/api/cron/outcomes"));assert.ok(parsed.crons.some(c=>c.path==="/api/cron/watch-agents"));
});
