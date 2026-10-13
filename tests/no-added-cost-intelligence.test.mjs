import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadSiteModule} from './load-site-module.mjs';
const provenance=await loadSiteModule('../packages/shared/src/provenance.ts');
const quality=await loadSiteModule('../apps/site/src/lib/terminal/data-quality.ts',{'../../../../../packages/shared/src/provenance':provenance});
const frames=await loadSiteModule('../packages/shared/src/error-frames.ts');
const validation=await loadSiteModule('../apps/site/src/lib/ops/outcome-validation.ts');

test('volume proxies have lower source confidence than observed sources and stale evidence loses weight',()=>{
  const now=Date.now();
  const observed=quality.evidenceQuality('crypto',{timestamp:new Date(now).toISOString()},'QA',now);
  const derived=quality.evidenceQuality('crypto',{timestamp:new Date(now).toISOString(),note:'24h volume (not a single whale tx)'},'QA',now);
  assert.equal(observed.independentSources,1); assert.equal(derived.kind,'derived'); assert.ok(derived.confidence<observed.confidence);
  assert.equal(quality.evidenceQuality('crypto',{timestamp:new Date(now-3600000).toISOString()},'QA',now).freshness,'stale');
  assert.equal(quality.evidenceQuality('crypto',{},'QA',now).freshness,'unknown');
});
test('fresh relevant holdings outrank stale high-attention items without inventing source corroboration',()=>{
  const base={symbol:'BTC',module:'crypto',confidence:70,dataQuality:{confidence:65,freshness:'fresh'}};
  assert.ok(quality.rankOpportunity(base,new Set(['BTC']))>quality.rankOpportunity({...base,symbol:'OTHER',confidence:90,dataQuality:{confidence:20,freshness:'stale'}},new Set()));
});
test('expired markets and malformed expiry dates are excluded, valid open markets remain',()=>{
  const at=Date.parse('2026-10-13T00:00:00Z');
  for(const row of [{endDate:'2026-10-12'},{endDate:'invalid'},{closed:true},{active:false},{acceptingOrders:false}])assert.equal(quality.isOpenPrediction(row,at),false);
  assert.equal(quality.isOpenPrediction({endDate:'2026-10-14'},at),true);
});
test('same headlines from multiple wires are counted once and stale/future news is discarded',()=>{
  const at=Date.now();const stamp=n=>new Date(at+n).toISOString();
  const rows=[{headline:'BTC surges!',timestamp:stamp(0)},{headline:'BTC SURGES',timestamp:stamp(-1000)},{headline:'Old',timestamp:stamp(-8*86400000)},{headline:'Future',timestamp:stamp(120000)}];
  assert.equal(quality.uniqueHeadlines(rows,at).length,1);
});
test('500 simultaneous briefing readers share a single provider collection; cache keys contain no account data',async()=>{
  let calls=0,options;
  const provider=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));return[{timestamp:new Date().toISOString()}];};
  const cache=await loadSiteModule('../apps/site/src/lib/terminal/shared-home-feeds.ts',{
    'next/cache':{unstable_cache:(fn,keys,opts)=>{options={keys,opts};return fn;}},
    './feeds':{fetchWhaleAlerts:provider,fetchLineMoves:provider,fetchPredictionMarkets:provider,fetchCongressTrades:provider,scanUnusualOptions:()=>[],scanPennyMovers:()=>[]},
    './market-truth':{getDataMode:()=> 'PRODUCTION'},'./provider-switches':{providerHealthFlags:()=>({ODDS_API:true})},
    './data-quality':quality,
  });
  const start=performance.now(); const snapshots=await Promise.all(Array.from({length:500},()=>cache.getSharedHomeFeeds()));
  assert.equal(calls,4);assert.equal(new Set(snapshots.map(x=>x.collectedAt)).size,1);
  await cache.getSharedHomeFeeds();assert.equal(calls,4);assert.equal(options.opts.revalidate,300);
  assert.doesNotMatch(JSON.stringify(options),/user|portfolio|email/);
  console.log(`Shared-feed concurrency fixture: 500 readers, 4 provider calls, ${Math.round(performance.now()-start)}ms.`);
});
test('failed shared collections cool down instead of retrying providers for every visitor',async()=>{
  let calls=0;
  const cache=await loadSiteModule('../apps/site/src/lib/terminal/shared-home-feeds.ts',{
    'next/cache':{unstable_cache:fn=>fn},'./feeds':{fetchWhaleAlerts:async()=>{calls++;throw Error('offline');},fetchLineMoves:async()=>[],fetchPredictionMarkets:async()=>[],fetchCongressTrades:async()=>[],scanUnusualOptions:()=>[],scanPennyMovers:()=>[]},
    './market-truth':{getDataMode:()=> 'PRODUCTION'},'./provider-switches':{providerHealthFlags:()=>({})},
    './data-quality':quality,
  });
  await assert.rejects(cache.getSharedHomeFeeds());await assert.rejects(cache.getSharedHomeFeeds(),/cooling down/);assert.equal(calls,1);
});
test('crash diagnostics keep build asset locations and reject sensitive or untrusted paths',()=>{
  const stack='Error private@example.test\n at fn (https://www.motivefxai.com/terminal/assets/index-ABC.js:12:34)\n at https://external.test/account/secret.js:1:2?token=private';
  const clean=frames.safeErrorFrames(stack);
  assert.equal(clean.length,1);assert.equal(clean[0],'/terminal/assets/index-ABC.js:12:34');
  assert.doesNotMatch(JSON.stringify(clean),/private|token|https/);
  assert.equal(frames.validateErrorFrames(['/account/private.js:1:2','/terminal/assets/a.js:1:2?secret']).length,0);
});
test('outcome coverage de-duplicates asset days and purges unfinished training horizons before holdout',()=>{
  const rows=Array.from({length:100},(_,i)=>({symbol:i%2?'BTC':'USDT',horizonDays:30,outcome:'PARTIAL',snapshot:{recordedAt:new Date(Date.UTC(2026,0,1)+i*86400000)}}));
  rows.push({...rows[0],snapshot:{recordedAt:new Date(rows[0].snapshot.recordedAt.getTime()+60000)}});
  const result=validation.summarizeOutcomeValidation(rows);
  assert.equal(result.distinctAssetDays,100);assert.equal(result.uniqueSymbols,2);
  assert.match(result.note,/correlated/);
  assert.equal(result.purgedTrainingSamples,40);assert.equal(result.holdoutSamples,30);assert.equal(result.forecastReady,false);
});
