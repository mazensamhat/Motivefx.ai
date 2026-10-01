import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../web/package.json', import.meta.url));
const ts = require('typescript');
const load = async (path) => {
 const source = readFileSync(new URL(path, import.meta.url), 'utf8');
 const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }}).outputText;
 return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};
const {requestChief} = await load('../web/src/features/ask-motive/chief-transport.ts');
const {withDeadline,AskDeadlineError} = await load('../apps/site/src/lib/ask-motive/deadline.ts');
const messages = [{role:'user',content:'Explain the BTC signal'}];
test('sends last 24 turns, context, cookie credentials, and optional token', async()=>{
 let seen;
 const out=await requestChief(Array.from({length:31},(_,i)=>({role:'user',content:String(i)})),{tab:'crypto',symbol:'BTC'}, {token:'test-only',fetcher:async(url,init)=>{seen={url,...init,body:JSON.parse(init.body)};return Response.json({reply:'Evidence reviewed',followUps:['Why?',null,5]});}});
 assert.equal(seen.url,'/api/ask-motive');assert.equal(seen.credentials,'same-origin');assert.equal(seen.headers.Authorization,'Bearer test-only');
 assert.equal(seen.body.messages.length,24);assert.equal(seen.body.messages[0].content,'7');assert.equal(seen.body.context.symbol,'BTC');assert.deepEqual(out.followUps,['Why?']);
});
test('rejects empty 200 replies, rather than displaying an ellipsis',async()=>{
 await assert.rejects(requestChief(messages,{tab:'home'},{fetcher:async()=>Response.json({reply:'  '})}),/empty response/);
});
test('expired authentication is explicit',async()=>{
 await assert.rejects(requestChief(messages,{tab:'home'},{fetcher:async()=>Response.json({},{status:401})}),/session has expired/);
});
test('preserves entitlement failure without granting access',async()=>{
 await assert.rejects(requestChief(messages,{tab:'home'},{fetcher:async()=>Response.json({detail:{message:'Plan required'}},{status:403})}),/Plan required/);
});
test('handles string detail errors',async()=>{
 await assert.rejects(requestChief(messages,{tab:'home'},{fetcher:async()=>Response.json({detail:'Question too long'},{status:400})}),/Question too long/);
});
test('server HTML timeout is recoverable and does not leak internals',async()=>{
 await assert.rejects(requestChief(messages,{tab:'home'},{fetcher:async()=>new Response('FATAL prisma connection password internal',{status:504})}),e=>/service is unavailable/.test(e.message)&&!e.message.includes('prisma'));
});
test('client timeout aborts the actual fetch',async()=>{
 let aborted=false;
 await assert.rejects(requestChief(messages,{tab:'home'},{timeoutMs:5,fetcher:async(_,init)=>new Promise((resolve,reject)=>{init.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('aborted','AbortError'));});})}),/took too long/);
 assert.ok(aborted);
});
test('user cancel aborts request',async()=>{
 const controller=new AbortController();
 const work=requestChief(messages,{tab:'home'},{signal:controller.signal,fetcher:async(_,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))});
 controller.abort();await assert.rejects(work,/Request stopped/);
});
test('server deadline returns successful result',async()=>assert.equal(await withDeadline(async()=>42,100,'test'),42));
test('server deadline stops waiting for hung data',async()=>{
 await assert.rejects(withDeadline(()=>new Promise(()=>{}),5,'data'),AskDeadlineError);
});
test('pre-aborted work does not start',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 await assert.rejects(withDeadline(async()=>{calls++;return 1;},10,'data',c.signal),AskDeadlineError);assert.equal(calls,0);
});
test('late dependency rejection is consumed after deadline',async()=>{
 await assert.rejects(withDeadline(()=>new Promise((_,reject)=>setTimeout(()=>reject(Error('late')),15)),2,'data'),AskDeadlineError);
 await new Promise(r=>setTimeout(r,20));
});
test('long history stays within the server body budget and retains the latest question',async()=>{
 let body;
 await requestChief(Array.from({length:30},(_,i)=>({role:'user',content:`${i}:`+'x'.repeat(3990)})),{tab:'home'},{fetcher:async(_,init)=>{body=init.body;return Response.json({reply:'Received'});}});
 assert.ok(body.length<=60000);assert.ok(JSON.parse(body).messages.at(-1).content.startsWith('29:'));
});
