import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(new URL('../web/package.json', import.meta.url));
const ts = require('typescript');
async function load(relative, mocks = {}) {
 const module = { exports: {} };
 const source = await readFile(new URL(relative, import.meta.url), 'utf8');
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  module, exports: module.exports, Date, console, require: name => {
   if (name in mocks) return mocks[name];
   throw Error(`Unexpected dependency ${name}`);
  },
 });
 return module.exports;
}
const predictive = await load('../apps/site/src/lib/terminal/engines/predictive.ts');
async function fixture({readFails=false,writeFails=false}={}) {
 const writes=[];
 const existing={themeWatchlist:[],alertRules:[{id:'custom',kind:'probability_above',threshold:50,enabled:false,label:'Custom'}],
  watchAgents:[{id:'saved',label:'Saved agent',enabled:true,metric:'motive_signal',operator:'above',threshold:70}],
  portfolioBooks:{trades:{activeId:'primary',books:[{id:'primary',name:'Primary',holdings:[{symbol:'NVDA'}]}]}}};
 const api=await load('../apps/site/src/lib/terminal/intel-prefs.ts',{
  './engines/predictive':predictive,
  '@motivefx/database':{prisma:{userIntelPref:{
   findUnique:async()=>{if(readFails)throw Error('read unavailable');return {prefsJson:JSON.stringify(existing)};},
   upsert:async args=>{writes.push(args);if(writeFails)throw Error('write unavailable');},
  }}},
 });
 return {api,writes,existing};
}
test('unavailable preference read blocks updates instead of replacing saved agents and books',async()=>{
 const f=await fixture({readFails:true});await assert.rejects(f.api.saveIntelPrefs('owner',{themeWatchlist:[]}),/read unavailable/);assert.equal(f.writes.length,0);
});
test('failed database write is never acknowledged as a saved Watch Agent',async()=>{
 const f=await fixture({writeFails:true});await assert.rejects(f.api.saveIntelPrefs('owner',{themeWatchlist:[]}),/write unavailable/);
});
test('unrelated preference edit preserves saved watch agents, portfolio books and custom rules',async()=>{
 const f=await fixture();const result=await f.api.saveIntelPrefs('owner',{themeWatchlist:[]});
 assert.equal(result.watchAgents[0].id,'saved');assert.equal(result.alertRules[0].id,'custom');
 assert.deepEqual(JSON.parse(JSON.stringify(result.portfolioBooks)),f.existing.portfolioBooks);assert.equal(f.writes.length,1);
});
test('strict preference reads report failure while best-effort briefings can continue',async()=>{
 const f=await fixture({readFails:true});await assert.rejects(f.api.getIntelPrefs('owner',{strict:true}));assert.ok(await f.api.getIntelPrefs('owner'));
});
test('legacy built-in probability label becomes a signal label without changing its enabled state',()=>{
 const prefs=predictive.normalizePrefs({alertRules:[{id:'default-prob-75',label:'Theme probability ≥ 75%',enabled:false,threshold:75,kind:'probability_above'}]});
 assert.equal(prefs.alertRules[0].label,'Motive Signal ≥ 75');assert.equal(prefs.alertRules[0].enabled,false);
});
