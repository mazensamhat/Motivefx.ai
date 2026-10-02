import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../web/package.json', import.meta.url));
const ts = require('typescript');
async function load(path, replacements = []) {
 let source=readFileSync(new URL(path,import.meta.url),'utf8');
 for(const [before,after] of replacements) { assert.ok(source.includes(before), `Missing fixture import: ${before}`); source=source.replace(before,after); }
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const {createAuthMeClient,AuthLookupUnavailable}=await load('../web/src/lib/authMe.ts');
const member={user:{id:'qa-member',email:'member@example.test',intelligenceTier:'elite',hasSubscription:true,selectedMarkets:['stocks','crypto','pink_slips','sports_betting','prediction_markets']}};
test('concurrent and forced bootstrap consumers share one network request',async()=>{
 let requests=0,finish;
 const c=createAuthMeClient(async()=>{requests++;return new Promise(r=>finish=r);});
 const a=c.read(),b=c.read(true),d=c.read();assert.equal(requests,1);
 finish(Response.json(member));assert.deepEqual(await a,member);assert.deepEqual(await b,member);assert.deepEqual(await d,member);
});
test('success is cached for identity and plan consumers',async()=>{
 let requests=0;const c=createAuthMeClient(async()=>{requests++;return Response.json(member);});
 await c.read();await c.read();assert.equal(requests,1);
});
test('only confirmed 401 becomes a guest, and guest is also cached',async()=>{
 let requests=0;const c=createAuthMeClient(async()=>{requests++;return Response.json({},{status:401});});
 assert.equal(await c.read(),null);assert.equal(await c.read(),null);assert.equal(requests,1);
});
for(const status of [403,429,500,503,504]) test(`HTTP ${status} is an unavailable check, never revoked membership`,async()=>{
 const c=createAuthMeClient(async()=>new Response('unavailable',{status}));
 await assert.rejects(c.read(),AuthLookupUnavailable);
});
test('network error does not resolve as an anonymous user',async()=>{
 const c=createAuthMeClient(async()=>{throw new TypeError('network');});await assert.rejects(c.read(),AuthLookupUnavailable);
});
test('malformed successful payload fails closed',async()=>{
 const c=createAuthMeClient(async()=>Response.json({user:{email:'bad@example.test'}}));await assert.rejects(c.read(),AuthLookupUnavailable);
});
test('failed revalidation never serves stale paid privileges',async()=>{
 let fail=false;const c=createAuthMeClient(async()=>fail?Response.json({},{status:503}):Response.json(member));
 await c.read();fail=true;await assert.rejects(c.read(true),AuthLookupUnavailable);await assert.rejects(c.read(),AuthLookupUnavailable);
});
test('a revoked session replaces cached membership with guest',async()=>{
 let guest=false;const c=createAuthMeClient(async()=>Response.json(guest?{}:member,{status:guest?401:200}));
 await c.read();guest=true;assert.equal(await c.read(true),null);assert.equal(await c.read(),null);
});
test('timeout aborts the fetch and provides retryable state',async()=>{
 let aborted=false;const c=createAuthMeClient(async(_,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('aborted','AbortError'));})),5);
 await assert.rejects(c.read(),AuthLookupUnavailable);assert.ok(aborted);
});
test('logout invalidation prevents an old response from restoring the prior account',async()=>{
 let finish;const c=createAuthMeClient(async()=>new Promise(r=>finish=r));
 const stale=c.read();c.invalidate();finish(Response.json(member));await assert.rejects(stale,AuthLookupUnavailable);
});
test('service recovery restores the actual server membership',async()=>{
 let up=false;const c=createAuthMeClient(async()=>Response.json(up?member:{},{status:up?200:503}));
 await assert.rejects(c.read(),AuthLookupUnavailable);up=true;assert.deepEqual(await c.read(true),member);
});

// Execute actual /auth/me route with test dependencies; no real cookies, keys or account writes.
const key=Symbol.for('motivefx.auth.bootstrap.qa');
const state={actor:null,user:null,reads:0};
globalThis[key]={
 json:(value)=>Response.json(value), unauthorized:()=>Response.json({error:'Unauthorized'},{status:401}),
 getSession:async()=>state.actor, getEffectiveSession:async()=>state.actor,
 isAdminEmail:()=>false, findUserSafeCached:async()=>{state.reads++;if(state.fail)throw Error('pool');return state.user;},
 userHasActiveSubscription:(u)=>u.subscriptionStatus==='comp',
 isTrustedNativeReaderRequest:async()=>false,
 planForUser:(u)=>({tier:u.intelligenceTier,active:u.subscriptionStatus==='comp'?['trades','crypto','penny','betting','predictions']:[],features:{ask_motive:u.subscriptionStatus==='comp'}}),
 iosAppStoreReaderPlan:()=>({tier:'lite',active:[]}), getSimulationStatus:()=>({active:false}),
 MODULE_CATALOG:{}, ANNUAL_PRICE_USD:1299,
 withDeadline:async(fn)=>fn(),
};
const deps=[
 ['import { json, unauthorized } from "@/lib/api";', 'json, unauthorized'],
 ['import { getSession } from "@/lib/session";', 'getSession'],
 ['import { getEffectiveSession } from "@/lib/ops/impersonation";', 'getEffectiveSession'],
 ['import { isAdminEmail } from "@/lib/admin";', 'isAdminEmail'],
 ['import { findUserSafeCached } from "@/lib/load-user";', 'findUserSafeCached'],
 ['import { userHasActiveSubscription } from "@/lib/subscription-access";', 'userHasActiveSubscription'],
 ['import { isTrustedNativeReaderRequest } from "@/lib/terminal/ios-reader";', 'isTrustedNativeReaderRequest'],
 ['import { planForUser, iosAppStoreReaderPlan } from "@/lib/terminal/plan";', 'planForUser, iosAppStoreReaderPlan'],
 ['import { getSimulationStatus } from "@/lib/terminal/simulation";', 'getSimulationStatus'],
 ['import { MODULE_CATALOG, ANNUAL_PRICE_USD } from "@/lib/terminal/modules-catalog";', 'MODULE_CATALOG, ANNUAL_PRICE_USD'],
 ['import { withDeadline } from "@/lib/ask-motive/deadline";', 'withDeadline'],
].map(([line,names])=>[line,`const {${names}} = globalThis[Symbol.for('motivefx.auth.bootstrap.qa')];`]);
const {GET}=await load('../apps/site/src/app/api/auth/me/route.ts',deps);
test('anonymous bootstrap never queries Postgres',async()=>{
 state.actor=null;state.reads=0;state.fail=false;
 assert.equal((await GET(new Request('https://qa.invalid/api/auth/me'))).status,401);assert.equal(state.reads,0);
});
test('database error is 503, not 401 or an empty plan',async()=>{
 state.actor={id:'qa-member'};state.fail=true;
 const res=await GET(new Request('https://qa.invalid/api/auth/me'));assert.equal(res.status,503);assert.equal((await res.json()).code,'session_unavailable');state.fail=false;
});
test('disabled account remains unauthorized',async()=>{
 state.actor={id:'qa-member'};state.user={id:'qa-member',disabledAt:new Date()};
 assert.equal((await GET(new Request('https://qa.invalid/api/auth/me'))).status,401);
});
test('verified member gets identity and full server plan in one response',async()=>{
 state.actor={id:'qa-member',email:'member@example.test'};state.reads=0;
 state.user={id:'qa-member',email:'member@example.test',intelligenceTier:'elite',selectedMarkets:JSON.stringify(member.user.selectedMarkets),subscriptionStatus:'comp',disabledAt:null};
 const res=await GET(new Request('https://qa.invalid/api/auth/me'));const data=await res.json();
 assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(data.user.hasSubscription,true);assert.equal(data.modules.active.length,5);assert.equal(data.modules.features.ask_motive,true);assert.equal(state.reads,1);
});
