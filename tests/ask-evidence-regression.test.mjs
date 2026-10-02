import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const base = '../apps/site/src/lib/ask-motive/';
const urlFor = async (path) => 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(await readFile(new URL(path, import.meta.url), 'utf8'))).toString('base64');
const evidenceUrl = await urlFor(base + 'request-evidence.ts');
const { createRequestEvidence, summarizePortfolioScan, unavailableEvidence, finalAnswerStep, classifyAskFailure } = await import(evidenceUrl);
const wait = (ms) => new Promise(r => setTimeout(r,ms));

test('concurrent duplicate reads start one data request',async()=>{
 const c=createRequestEvidence(new AbortController().signal);let calls=0;
 const read=()=>c.read('briefing',async()=>{calls++;await wait(3);return {score:73};});
 const [a,b]=await Promise.all([read(),read()]);assert.equal(a,b);assert.equal(calls,1);assert.deepEqual(c.stats(),{readsStarted:1,readsReused:1});
});
test('a failed read is not repeated within the same request',async()=>{
 const c=createRequestEvidence(new AbortController().signal);let calls=0;
 const read=()=>c.read('portfolio:crypto',async()=>{calls++;throw Error('pool');});
 await assert.rejects(read());await assert.rejects(read());assert.equal(calls,1);
});
test('request scopes never share user data',async()=>{
 const a=createRequestEvidence(new AbortController().signal),b=createRequestEvidence(new AbortController().signal);
 assert.equal(await a.read('portfolio:crypto',async()=>1),1);assert.equal(await b.read('portfolio:crypto',async()=>2),2);
});
test('cancellation before the microtask prevents starting work',async()=>{
 const ctrl=new AbortController();const c=createRequestEvidence(ctrl.signal);let calls=0;
 const p=c.read('a',async()=>{calls++;return 1;});ctrl.abort();await assert.rejects(p);assert.equal(calls,0);
});
test('already aborted request does not consult cached private evidence',async()=>{
 const ctrl=new AbortController(),c=createRequestEvidence(ctrl.signal);await c.read('a',async()=>1);ctrl.abort();await assert.rejects(c.read('a',async()=>2));
});
test('all failures remain unknown, never empty portfolios',()=>{
 const result=summarizePortfolioScan(['trades','crypto'].map(m=>unavailableEvidence(m)));
 assert.equal(result.desksEmpty,0);assert.equal(result.desksUnavailable,2);assert.equal(result.desksWithData,0);assert.equal(result.partial,true);
 assert.doesNotMatch(result.note,/no holdings|no open positions/i);assert.match(result.note,/unknown, not empty/);
});
test('mixed outcomes distinguish populated, empty and unread ledgers',()=>{
 const r=summarizePortfolioScan([{module:'trades',empty:false,summary:'Present'},{module:'penny',empty:true},unavailableEvidence('crypto')]);
 assert.equal(r.desksWithData,1);assert.equal(r.desksEmpty,1);assert.equal(r.desksUnavailable,1);
});
test('only successful empty ledgers produce the empty explanation',()=>{
 const r=summarizePortfolioScan([{module:'trades',empty:true},{module:'crypto',empty:true}]);
 assert.equal(r.partial,false);assert.equal(r.desksUnavailable,0);assert.match(r.note,/read successfully/);
});
test('the last generation step cannot request another tool',()=>{
 assert.equal(finalAnswerStep(0),undefined);assert.equal(finalAnswerStep(2),undefined);assert.deepEqual(finalAnswerStep(3),{toolChoice:'none'});
});
for(const [name,error,expected] of [
 ['session',{name:'AskDeadlineError',message:'Ask Motive deadline: session'},'session_timeout'],
 ['plan',{name:'AskDeadlineError',message:'Ask Motive deadline: entitlements'},'entitlements_timeout'],
 ['rate-limit',{statusCode:429,message:'SECRET'},'provider_rate_limit'],
 ['provider-key',{statusCode:401,message:'SECRET'},'provider_auth'],
 ['provider-server',{statusCode:500,message:'SECRET'},'provider_failure'],
 ['database',{code:'P2024',message:'SECRET'},'database_pool'],
 ['empty',{message:'ask_motive_empty_response'},'empty_response'],
 ['unknown',{message:'SECRET'},'dependency_failure'],
]) test(`safe failure classification: ${name}`,()=>{const code=classifyAskFailure(error);assert.equal(code,expected);assert.ok(!code.includes('SECRET'));});

// Actual runner: isolate SDK and database/provider functions, keep all orchestration real.
let env;
const key = '__motiveEvidenceTest';
globalThis[key] = {
 z: new Proxy({}, { get:()=>()=>chain }),
 stepCountIs: n=>n, tool:t=>t,
 createOpenAI:()=>id=>id,
 generateText: options=>env.generate(options),
 after: fn=>{if(env.scheduleFails)throw Error('schedule');env.after.push(fn);},
 recordAiUsage: row=>env.records.push(row),
 resolveNavigateTab: x=>['home','stocks','crypto','penny','betting','predictions'].includes(x)?x:null,
 suggestFollowUps:()=>[],tabAwareHint:()=>'',
 toolExplainNavigation:()=>({guide:'Use the desk ledger.',tip:'The sidebar opens markets.'}),
 toolGetBriefing: async()=>{env.briefCalls++;return {opportunityCount:1,opportunities:[{symbol:'NVDA',confidence:74,title:'Review'}]};},
 toolAnalyzePortfolio:async ({userId,module})=>{env.portfolioCalls.push({userId,module});return env.analyze(module);},
 toolExplainSymbol:async symbol=>({symbol}),
};
const chain = new Proxy(()=>{}, {get:()=>()=>chain,apply:()=>chain});
let runner = stripTypeScriptTypes(await readFile(new URL(base+'run-bounded.ts',import.meta.url),'utf8'));
runner=runner.replace(/import[\s\S]*?from ["'][^"']+["'];/g,(s)=>{
 if(s.includes('./request-evidence'))return s.replace('./request-evidence',evidenceUrl);
 if(s.includes('./deadline'))return 'const withDeadline = (work) => work();';
 if(s.includes('./system-prompt'))return 'const CHIEF_DISCLAIMER="Not financial advice.", CHIEF_OF_FINANCE_SYSTEM_PROMPT="Test system";';
 return '';
});
runner=runner.replace('await import("@/lib/ops/durable")',`globalThis.${key}`);
runner=`const {generateText,stepCountIs,tool,createOpenAI,after,z,resolveNavigateTab,suggestFollowUps,tabAwareHint,toolAnalyzePortfolio,toolExplainNavigation,toolExplainSymbol,toolGetBriefing}=globalThis.${key};\n`+runner;
const {runAskMotiveBounded}=await import('data:text/javascript;base64,'+Buffer.from(runner).toString('base64'));
const ctx={userId:'test-user',displayName:'QA',plan:{allowedMarkets:['trades','crypto','penny','betting','predictions']},context:{tab:'home'}};
function setup(t){
 const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-not-a-real-key';
 env={briefCalls:0,portfolioCalls:[],after:[],records:[],analyze:async module=>({module,empty:false,summary:'Recorded QA data'}),generate:async()=>({text:'Answer',usage:{inputTokens:10,outputTokens:5}})};
 t.after(()=>{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;});
}
const run=(context=ctx,content='Scan my whole portfolio')=>runAskMotiveBounded([{role:'user',content}],context,new AbortController().signal);
async function flush(){for(const f of env.after)await f();}

test('runner shares briefing between overview and opportunities tools',async t=>{
 setup(t);env.generate=async o=>{const [a,b]=await Promise.all([o.tools.get_briefing.execute({}),o.tools.list_opportunities.execute({limit:3})]);assert.equal(a.opportunities[0].symbol,b.top[0].symbol);return {text:'Reviewed current evidence.',usage:{}};};
 await run();assert.equal(env.briefCalls,1);await flush();assert.equal(env.records[0].metadata.readsReused,1);
});
test('runner shares whole-book data with a follow-up single market tool',async t=>{
 setup(t);env.generate=async o=>{await o.tools.scan_all_portfolios.execute({});await o.tools.analyze_portfolio.execute({module:'crypto'});return {text:'Reviewed ledgers.',usage:{}};};
 await run();assert.equal(env.portfolioCalls.length,5);await flush();assert.equal(env.records[0].metadata.readsReused,1);
});
test('runner keeps partial book failure separate from confirmed empty',async t=>{
 setup(t);env.analyze=async m=>{if(m==='crypto')throw Error('P2024 SECRET');return {module:m,empty:m==='penny',summary:'Known data'};};
 env.generate=async o=>{const scan=await o.tools.scan_all_portfolios.execute({});assert.equal(scan.desksUnavailable,1);assert.equal(scan.desksEmpty,1);assert.equal(scan.desksWithData,3);assert.equal(scan.results.find(r=>r.module==='crypto').empty,false);return {text:'Crypto unavailable; other ledgers reviewed.',usage:{}};};
 const r=await run();assert.equal(r.degraded,true);await flush();assert.equal(env.records[0].status,'degraded');assert.deepEqual(env.records[0].metadata.failedTools,['portfolio']);
});
test('whole-book scan reads only markets included in verified plan',async t=>{
 setup(t);env.generate=async o=>{const r=await o.tools.scan_all_portfolios.execute({});assert.equal(r.desksScanned,1);const locked=await o.tools.analyze_portfolio.execute({module:'crypto'});assert.equal(locked.locked,true);return {text:'Stocks reviewed.',usage:{}};};
 await run({...ctx,plan:{allowedMarkets:['trades']}});assert.deepEqual(env.portfolioCalls.map(x=>x.module),['trades']);
});
test('no-key fallback also never converts database failure to no holdings',async t=>{
 setup(t);delete process.env.OPENAI_API_KEY;env.analyze=async()=>{throw Error('database');};
 const r=await run();assert.equal(r.degraded,true);assert.match(r.reply,/unknown, not empty/);assert.doesNotMatch(r.reply,/No holdings|add.*holdings.*first/i);
 await flush();assert.equal(env.records[0].status,'degraded');assert.equal(env.records[0].errorCode,'model_not_configured');
});
test('no-key help preserves navigation without database calls',async t=>{
 setup(t);delete process.env.OPENAI_API_KEY;const r=await run(ctx,'Open crypto');assert.deepEqual(r.actions,[{type:'navigate',tab:'crypto'}]);assert.equal(env.briefCalls,0);assert.equal(env.portfolioCalls.length,0);
});
test('no-key contextual portfolio request targets the current desk',async t=>{
 setup(t);delete process.env.OPENAI_API_KEY;await run({...ctx,context:{tab:'crypto'}},'Review my portfolio');assert.deepEqual(env.portfolioCalls.map(x=>x.module),['crypto']);
});
test('no-key opportunity reply labels signal scores, not percentage probabilities',async t=>{
 setup(t);delete process.env.OPENAI_API_KEY;const r=await run(ctx,'Show signals today');assert.match(r.reply,/74\/100 \(not a probability\)/);assert.doesNotMatch(r.reply,/74%/);
});
test('runner passes final-answer instruction and real abort signal to SDK',async t=>{
 setup(t);env.generate=async o=>{assert.deepEqual(o.prepareStep({stepNumber:3}),{toolChoice:'none'});assert.ok(o.abortSignal instanceof AbortSignal);return {text:'Final answer.',usage:{}};};
 await run();
});
test('provider failures are recorded with safe code and duration',async t=>{
 setup(t);env.generate=async()=>{throw Object.assign(Error('SECRET account provider text'),{statusCode:429});};
 await assert.rejects(run());await flush();const r=env.records[0];assert.equal(r.status,'error');assert.equal(r.errorCode,'provider_rate_limit');assert.equal(typeof r.durationMs,'number');assert.ok(!JSON.stringify(r).includes('SECRET'));
});
test('empty model output is an explicit recorded failure, not fake success',async t=>{
 setup(t);env.generate=async()=>({text:'',usage:{outputTokens:0}});await assert.rejects(run(),/empty_response/);await flush();assert.equal(env.records[0].errorCode,'empty_response');
});
test('optional metering scheduling failure never loses a valid answer',async t=>{
 setup(t);env.scheduleFails=true;const r=await run();assert.equal(r.reply.startsWith('Answer'),true);
});

// Request boundary tests retain auth/access logic; schema parsing is isolated here.
class AccessDeniedError extends Error {}
class FeatureLockedError extends Error {}
class ModuleLockedError extends Error {}
const schema = new Proxy(()=>{}, {get:(_,key)=>key==='safeParse' ? data=>({success:true,data}) : ()=>schema,apply:()=>schema});
const routeEnv={z:new Proxy({}, {get:()=>()=>schema}),AccessDeniedError,FeatureLockedError,ModuleLockedError,
 accessErrorResponse:e=>Response.json({detail:e.message},{status:403}),
 requireTerminalSession:()=>env.auth(),entitlementsPlanForUser:()=>env.plan(),requireFeature:()=>env.feature(),
 runAskMotiveBounded:()=>env.answer(),withDeadline:work=>work(),classifyAskFailure,CHIEF_DISCLAIMER:'Not financial advice.'};
globalThis.__motiveRouteTest=routeEnv;
let routeSource=stripTypeScriptTypes(await readFile(new URL('../apps/site/src/app/api/ask-motive/route.ts',import.meta.url),'utf8'));
routeSource=routeSource.replace(/import[\s\S]*?from ["'][^"']+["'];/g,'');
routeSource='const {z,accessErrorResponse,requireTerminalSession,AccessDeniedError,FeatureLockedError,ModuleLockedError,requireFeature,entitlementsPlanForUser,runAskMotiveBounded,withDeadline,classifyAskFailure,CHIEF_DISCLAIMER}=globalThis.__motiveRouteTest;\n'+routeSource;
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(routeSource).toString('base64'));
function setupRoute(t){setup(t);env.auth=async()=>({ok:true,session:{user:{id:'qa',displayName:'QA'}}});env.plan=async()=>({allowedMarkets:['trades']});env.feature=()=>{};env.answer=async()=>({reply:'Valid response.',degraded:false});}
const request=()=>new Request('https://qa.example.test/api/ask-motive',{method:'POST',body:JSON.stringify({messages:[{role:'user',content:'Explain signals'}]})});
test('route preserves 401 and does not run the assistant without a valid session',async t=>{
 setupRoute(t);env.auth=async()=>({ok:false,response:Response.json({error:'Sign in'},{status:401})});env.answer=async()=>{throw Error('must not run');};
 const r=await POST(request());assert.equal(r.status,401);assert.ok(r.headers.get('X-Motive-Request-Id'));assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('route preserves verified plan denials and never grants access on failure',async t=>{
 setupRoute(t);env.feature=()=>{throw new FeatureLockedError('Feature unavailable');};env.answer=async()=>{throw Error('must not run');};
 const r=await POST(request());assert.equal(r.status,403);assert.ok(r.headers.get('X-Motive-Request-Id'));
});
test('route surfaces database failure as recoverable 503, not expired session',async t=>{
 setupRoute(t);env.auth=async()=>{throw Object.assign(Error('SECRET P2024 connection pool'),{code:'P2024'});};
 const r=await POST(request());assert.equal(r.status,503);assert.equal(r.headers.get('Retry-After'),'10');const b=await r.json();assert.equal(b.detail.requestId,r.headers.get('X-Motive-Request-Id'));assert.ok(!JSON.stringify(b).includes('SECRET'));
});
test('successful route includes timing and a correlation id without changing the reply',async t=>{
 setupRoute(t);const r=await POST(request());assert.equal(r.status,200);assert.match(r.headers.get('Server-Timing'),/^motive;dur=\d+$/);const body=await r.json();assert.equal(body.reply,'Valid response.');
});
