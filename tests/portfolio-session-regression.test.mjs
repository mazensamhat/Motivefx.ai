import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../web/package.json', import.meta.url));
const ts = require('typescript');
async function load(path) {
 const source = await readFile(new URL(path, import.meta.url), 'utf8');
 const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
 return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { fetchAuthMe, invalidateAuthMe, SessionLookupError } = await load('../web/src/lib/authMe.ts');
const { sportGroup, predictionGroup } = await load('../web/src/lib/positionCategories.ts');
const originalFetch = globalThis.fetch;
const user = { id: 'fixture-owner', email: 'fixture@example.invalid', intelligenceTier: 'elite', hasSubscription: true };
test.afterEach(() => { globalThis.fetch = originalFetch; invalidateAuthMe(); });
test('twenty concurrent session reads use one request including forced calls', async () => {
 let calls=0; globalThis.fetch=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return Response.json({user});};
 const results=await Promise.all(Array.from({length:20},()=>fetchAuthMe(true)));
 assert.equal(calls,1);assert.ok(results.every(r=>r.user.id===user.id));
});
test('401 is the only HTTP failure that becomes a signed-out result', async()=> {
 globalThis.fetch=async()=>Response.json({error:'Unauthorized'},{status:401});assert.equal(await fetchAuthMe(),null);
});
for (const status of [403,429,500,502,503,504]) test(`HTTP ${status} is unavailable, never a signed-out user`, async()=>{
 globalThis.fetch=async()=>Response.json({error:'failure'},{status});await assert.rejects(fetchAuthMe(),SessionLookupError);
});
test('network failure is not an empty session',async()=>{
 globalThis.fetch=async()=>{throw new TypeError('network');};await assert.rejects(fetchAuthMe(),SessionLookupError);
});
test('malformed 200 user payload is unavailable, not signed out',async()=>{
 globalThis.fetch=async()=>Response.json({});await assert.rejects(fetchAuthMe(),SessionLookupError);
});
test('transient failure can recover immediately without a cached null user',async()=>{
 let calls=0;globalThis.fetch=async()=>++calls===1?Response.json({},{status:503}):Response.json({user});
 await assert.rejects(fetchAuthMe());assert.equal((await fetchAuthMe()).user.id,user.id);assert.equal(calls,2);
});
test('invalidation rejects an old in-flight response after logout',async()=>{
 let resolve;globalThis.fetch=()=>new Promise(r=>{resolve=r;});const old=fetchAuthMe();invalidateAuthMe();resolve(Response.json({user}));await assert.rejects(old,SessionLookupError);
});
for (const [source, expected] of [['icehockey_nhl','hockey'],['NHL','hockey'],['ice_hockey','hockey'],['Hockey','hockey'],['americanfootball_nfl','football'],['NFL','football'],['basketball_wnba','basketball'],['WNBA','basketball'],['baseball_mlb','baseball'],['soccer_usa_mls','soccer'],['mma_mixed_martial_arts','mma'],['tennis_atp','tennis'],['unknown','other'],['','other']]) test(`sport ${source || '(missing)'} filters as ${expected}`,()=>assert.equal(sportGroup(source),expected));
for (const [source,expected] of [['Sports & Predictions','sports'],['Sports','sports'],['Politics & Elections','politics'],['Economy & Fed','economy'],['Geopolitics & War','geopolitics'],['Celebrity & Culture','entertainment'],['Culture','entertainment'],['Science & Tech','science'],['Crypto Events','crypto'],['unknown','other']]) test(`prediction ${source} filters as ${expected}`,()=>assert.equal(predictionGroup(source),expected));
test('saved trackers use actual review content and independent filters',async()=>{
 for(const name of ['BetTracker','PredictionTracker']) { const source=await readFile(new URL(`../web/src/components/${name}.tsx`,import.meta.url),'utf8'); assert.match(source,/detail=\{/);assert.match(source,/Filter saved/);assert.match(source,/useSavedRows/);assert.doesNotMatch(source,/catch\(\(\) => set(?:Bets|Positions)\(\[\]\)\)/); }
});
test('portfolio bulk writes require a verified current read',async()=>{
 const source=await readFile(new URL('../web/src/components/PortfolioPanel.tsx',import.meta.url),'utf8');
 assert.match(source,/if \(!ledger.writable \|\| writeLock.current\) throw/);assert.match(source,/Retry holdings/);assert.doesNotMatch(source,/catch\(\(\) => applyHoldings\(\[\]\)\)/);
});
test('entitlement init does not seed demo portfolios or erase paid access on failure',async()=>{
 const source=await readFile(new URL('../web/src/hooks/useModules.tsx',import.meta.url),'utf8');assert.doesNotMatch(source,/advisor\/demo\/setup/);assert.match(source,/sitePlan\?\.hasSubscription && applySitePlanOnly/);assert.match(source,/A failed read is not a downgrade/);
});
