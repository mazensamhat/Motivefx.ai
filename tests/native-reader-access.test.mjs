import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
const require=createRequire(new URL('../web/package.json',import.meta.url));
const siteRequire=createRequire(new URL('../apps/site/package.json',import.meta.url));
const ts=require('typescript');
const jose=await import(pathToFileURL(siteRequire.resolve('jose')).href);
async function load(relative,mocks={}){
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(await readFile(new URL(relative,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  module,exports:module.exports,process,TextEncoder,Uint8Array,Request,console,
  require:name=>{if(name in mocks)return mocks[name];throw Error(`Unexpected dependency ${name}`);},
 });return module.exports;
}
const tokens=await load('../apps/site/src/lib/terminal/native-reader-token.ts',{jose,crypto:siteRequire('node:crypto')});
const readerPlan={allowedMarkets:['trades','crypto','penny','betting','predictions'],features:{ask_motive:true}};
const plans={iosAppStoreReaderPlan:()=>readerPlan,planForUser:user=>user.plan,hasModule:(p,m)=>p.allowedMarkets.includes(m),hasFeature:(p,f)=>p.features[f]===true};
let headers=new Headers();
const reader=await load('../apps/site/src/lib/terminal/ios-reader.ts',{'./plan':plans,'next/headers':{headers:async()=>headers},'./native-reader-token':tokens});
class Locked extends Error{}
const access=await load('../apps/site/src/lib/terminal/access.ts',{'./plan':plans,'./ios-reader':reader,'./auth':{FeatureLockedError:Locked,ModuleLockedError:Locked},'./simulation':{simHasModule:()=>false}});
const lockedPlan={allowedMarkets:[],features:{}},paidPlan={allowedMarkets:['betting'],features:{team_workspace:true}};
const spoof=()=>new Request('https://qa.invalid',{headers:{'user-agent':'MotiveFXNative (iOS)'}});
function env(t,values){const prev=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);t.after(()=>{for(const [k,v]of Object.entries(prev))if(v===undefined)delete process.env[k];else process.env[k]=v;});}
test('strict token mode rejects an iOS user-agent spoof before module access',async t=>{
 env(t,{NATIVE_READER_REQUIRE_TOKEN:'true'});await assert.rejects(access.requireModuleOrSimAllowingIosReader(spoof(),lockedPlan,{},'betting'),Locked);
});
test('valid signed iOS token grants free-reader markets but cannot unlock paid features',async t=>{
 env(t,{NATIVE_READER_REQUIRE_TOKEN:'true',NATIVE_READER_TOKEN_SECRET:'qa-test-secret-with-sufficient-length'});
 const {token}=await tokens.issueNativeReaderToken({channel:'app_store',platform:'ios',appVersion:'QA'});
 const req=new Request('https://qa.invalid',{headers:{'x-motivefx-native-reader':token}});
 await access.requireModuleOrSimAllowingIosReader(req,lockedPlan,{},'betting');
 await assert.rejects(access.requireFeatureAllowingIosReader(req,paidPlan,'team_workspace'),Locked);
 assert.equal(await reader.planForRequest(req,{plan:paidPlan}),readerPlan);
});
test('Android and mismatched-channel tokens cannot impersonate the App Store reader',async t=>{
 env(t,{NATIVE_READER_REQUIRE_TOKEN:'true',NATIVE_READER_TOKEN_SECRET:'qa-test-secret-with-sufficient-length'});
 for(const claims of [{channel:'play_store',platform:'android'},{channel:'play_store',platform:'ios'}]){
  const {token}=await tokens.issueNativeReaderToken({...claims,appVersion:'QA'});
  assert.equal(await reader.isTrustedNativeReaderRequest(new Request('https://qa.invalid',{headers:{'x-motivefx-native-reader':token}})),false);
 }
});
test('paid web access remains valid without a reader token',async t=>{
 env(t,{NATIVE_READER_REQUIRE_TOKEN:'true'});await access.requireModuleOrSimAllowingIosReader(new Request('https://qa.invalid'),paidPlan,{},'betting');
});
test('legacy free-reader identification remains available when strict mode is off',async t=>{
 env(t,{NATIVE_READER_REQUIRE_TOKEN:'false'});await access.requireModuleOrSimAllowingIosReader(spoof(),lockedPlan,{},'betting');
});
test('production without any configured signing key cannot issue or validate dev tokens',async t=>{
 env(t,{NODE_ENV:'production',NATIVE_READER_TOKEN_SECRET:'',JWT_SECRET_KEY:'',AUTH_SECRET:''});
 await assert.rejects(tokens.issueNativeReaderToken({channel:'app_store',platform:'ios',appVersion:'QA'}),/signing secret/);
 assert.equal(await tokens.verifyNativeReaderToken('invalid'),null);
});
