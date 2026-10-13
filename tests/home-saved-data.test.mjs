import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(new URL('../web/package.json',import.meta.url));
const ts=require('typescript');
async function load(path,mocks={}) {
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  module,exports:module.exports,console,setTimeout,clearTimeout,
  require:name=>{if(name in mocks)return mocks[name];throw Error(`Unmocked ${name}`);},
 });return module.exports;
}
const saved=await load('../packages/shared/src/saved-data-state.ts');
const provenance=await load('../packages/shared/src/provenance.ts');
const quality=await load('../apps/site/src/lib/terminal/data-quality.ts',{'../../../../../packages/shared/src/provenance':provenance});
async function fixture({failed=false,count=0,shared}={}) {
 let reads=0;
 const api=await load('../apps/site/src/lib/terminal/home-briefing.ts',{
  './portfolio':{portfolioSnapshot:async()=>{reads++;if(failed)throw Error('pool unavailable');return {counts:{trades:count,penny:0,crypto:0},symbols:{trades:count?['NVDA']:[],penny:[],crypto:[]}};}},
  './data-quality':quality,
  '../../../../../packages/shared/src/provenance':provenance,
  './shared-home-feeds':{getSharedHomeFeeds:shared ?? (async()=>({whales:[],lines:[],markets:[],congressTrades:[],options:[],penny:[],collectedAt:new Date().toISOString()}))},
  './bets':{listBets:async()=>[]},'./predictions':{listPredictions:async()=>[]},'./watchlist':{listWatchlist:async()=>[]},
  './feeds':{fetchCongressTrades:async()=>[],fetchLineMoves:async()=>[],fetchPredictionMarkets:async()=>[],fetchWhaleAlerts:async()=>[],scanPennyMovers:()=>[],scanUnusualOptions:()=>[]},
  './engines':{runPhase2Engines:()=>({probabilityViews:[],consensusBreaks:[],marketGenomes:[],signalGraph:{},consensusHistory:[],futureScenarios:{},themeSuggestions:[]}),enrichOpportunitiesWithProbability:x=>x},
  './intel-prefs':{getIntelPrefs:async()=>({themeWatchlist:[],alertRules:[],watchAgents:[]})},
  './signal-clarity':{pickSignalsForOpportunity:()=>[],stancePlainExplain:()=>''},
  '../../../../../packages/shared/src/saved-data-state':saved,
  '../../../../../packages/shared/src/briefing-period':{getBriefingPeriod:()=> 'morning',formatBriefingGreeting:()=> 'QA',formatBriefingKicker:()=> 'QA'},
 });return {api,reads:()=>reads};
}
test('a failed customer read produces unknown counts across every market',async()=>{
 const f=await fixture({failed:true});const b=await f.api.buildHomeBriefing({userId:'owner'});
 assert.equal(b.personalized.savedDataStatus,'unavailable');assert.equal(b.personalized.holdingsCount,null);assert.equal(b.personalized.watchlistCount,null);
 assert.ok(b.moduleSummaries.every(x=>x.count===null && x.newSignals===null));assert.doesNotMatch(b.personalized.intelNote,/add holdings/i);
});
test('a successful empty customer ledger remains a confirmed zero',async()=>{
 const f=await fixture();const b=await f.api.buildHomeBriefing({userId:'owner'});assert.equal(b.personalized.savedDataStatus,'available');assert.equal(b.personalized.holdingsCount,0);
});
test('loaded holdings retain their actual count',async()=>{
 const f=await fixture({count:3});const b=await f.api.buildHomeBriefing({userId:'owner'});assert.equal(b.personalized.holdingsCount,3);assert.equal(b.moduleSummaries[0].count,3);
});
test('anonymous briefings do not attempt customer database reads',async()=>{
 const f=await fixture({failed:true});const b=await f.api.buildHomeBriefing({userId:'demo'});assert.equal(f.reads(),0);assert.equal(b.personalized.savedDataStatus,'anonymous');
});

test('saved account reads start before a slow shared feed finishes and no historical comparison is invented',async()=>{
 let release;const wait=new Promise(resolve=>{release=resolve;});
 const f=await fixture({count:3,shared:()=>wait});
 const pending=f.api.buildHomeBriefing({userId:'owner'});
 assert.equal(f.reads(),1);
 release({whales:[],lines:[],markets:[],congressTrades:[],options:[],penny:[],collectedAt:new Date().toISOString()});
 const brief=await pending;assert.equal(brief.personalized.holdingsCount,3);
 assert.equal(brief.compareLens.length,0);assert.equal(brief.breakingNewsCount,0);
 assert.equal(brief.marketConfidence,'UNAVAILABLE');
});
