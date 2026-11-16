import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';
const crypto=siteRequire('node:crypto');
const hash=value=>crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
const now=new Date('2026-11-16T02:00:00Z');
async function harness(){
 let enabled=true,sending=true,user={id:'u',email:'fixture@example.invalid',disabledAt:null},entitled=true,consent=null,verified=null,tail=Promise.resolve(),queries=0;
 const challenges=new Map(),devices=new Map(),suppressed=[];
 const matches=(row,w)=>Object.entries(w).every(([key,value])=>{if(value&&typeof value==='object'){if('gt'in value)return row[key]>value.gt;if('gte'in value)return row[key]>=value.gte;return true;}return row[key]===value;});
 const tx={
  $queryRaw:async()=>{queries++;return[{id:user.id}];},user:{findUnique:async()=>user},
  emailVerificationChallenge:{findUnique:async({where})=>challenges.get(where.tokenHash)??null,findFirst:async({where})=>[...challenges.values()].filter(x=>matches(x,where)).sort((a,b)=>b.createdAt-a.createdAt)[0]??null,count:async({where})=>[...challenges.values()].filter(x=>matches(x,where)).length,create:async({data})=>{challenges.set(data.tokenHash,{usedAt:null,...data});return data;},updateMany:async({where,data})=>{let count=0;for(const [k,row]of challenges)if(matches(row,where)){challenges.set(k,{...row,...data});count++;}return{count};}},
  emailVerification:{upsert:async({create,update})=>{verified=verified?{...verified,...update}:create;}},
  notificationConsent:{findUnique:async()=>consent,upsert:async({create,update})=>{consent=consent?{...consent,...update}:create;return consent;}},
  notificationDelivery:{updateMany:async q=>{suppressed.push(q);return{count:1};}},
  notificationDevice:{findUnique:async({where})=>[...devices.values()].find(x=>x.token===where.token)??null,count:async({where})=>[...devices.values()].filter(x=>matches(x,where)).length,create:async({data})=>{const row={id:`device-${devices.size}`,revokedAt:null,...data};devices.set(row.id,row);return row;},update:async({where,data})=>{const row={...devices.get(where.id),...data};devices.set(row.id,row);return row;},updateMany:async({where,data})=>{for(const [k,row]of devices)if(matches(row,where))devices.set(k,{...row,...data});return{count:1};}}
 };
 const prisma={...tx,$transaction:fn=>{const run=tail.then(()=>fn(tx));tail=run.catch(()=>{});return run;}};
 const mod=await loadSiteModule('../apps/site/src/lib/notifications/onboarding.ts',{'node:crypto':crypto,'@motivefx/database':{prisma},'./policy':{emailHash:hash},'./store':{notificationStorageEnabled:()=>enabled,notificationSendingEnabled:()=>enabled&&sending},'../terminal/plan':{planForUser:()=>({features:{motive_daily_email:entitled,push_notifications:entitled}})}});
 return {mod,prisma,challenges,devices,suppressed,get queries(){return queries;},get consent(){return consent;},get verified(){return verified;},setConsent:x=>{consent=x;},setUser:x=>{user={...user,...x};},setEntitled:x=>{entitled=x;},disable:()=>{enabled=false;},stopSending:()=>{sending=false;}};
}
const flags=['MOTIVE_EMAIL_VERIFICATION_ENABLED','MOTIVE_PUSH_REGISTRATION_ENABLED'];
test.before(()=>{for(const key of flags)process.env[key]='true';});
test.after(()=>{for(const key of flags)delete process.env[key];});

test('inactive onboarding does not touch new storage or prepare a send',async()=>{
 const h=await harness();h.disable();assert.equal((await h.mod.prepareEmailVerification('u','account',now)).state,'inactive');assert.equal((await h.mod.confirmEmailVerification('anything',now)).state,'inactive');assert.equal((await h.mod.registerPushDevice('u',{token:'ExpoPushToken[fixture123]',platform:'android',permission:'granted'},now)).state,'inactive');assert.equal(h.queries,0);assert.equal(h.challenges.size,0);
});
test('sending gate blocks preparation even with storage activated',async()=>{const h=await harness();h.stopSending();assert.equal((await h.mod.prepareEmailVerification('u','account',now)).state,'inactive');assert.equal(h.challenges.size,0);});
test('verification tokens are opaque, purpose-separated, expiring and single-use under concurrency',async()=>{
 const h=await harness();const prepared=await h.mod.prepareEmailVerification('u','account',now);
 assert.match(prepared.token,/^mfxverify_[A-Za-z0-9_-]{43}$/);assert.equal(JSON.stringify([...h.challenges.values()]).includes(prepared.token),false);assert.notEqual(prepared.tokenHash,crypto.createHash('sha256').update(prepared.token).digest('hex'));
 const results=await Promise.all([h.mod.confirmEmailVerification(prepared.token,new Date(+now+1000)),h.mod.confirmEmailVerification(prepared.token,new Date(+now+1000))]);
 assert.deepEqual(results.map(x=>x.state).sort(),['invalid','verified']);assert.equal(h.verified.emailHash,hash('fixture@example.invalid'));assert.equal(h.consent,null);
});
test('expired, malformed, future and changed-address links never verify another identity',async()=>{
 for(const kind of ['expired','future','changed','disabled']){const h=await harness();const p=await h.mod.prepareEmailVerification('u','account',now);if(kind==='changed')h.setUser({email:'other@example.invalid'});if(kind==='disabled')h.setUser({disabledAt:now});const time=kind==='expired'?new Date(+now+31*60000):kind==='future'?new Date(+now-1000):new Date(+now+1000);assert.equal((await h.mod.confirmEmailVerification(p.token,time)).state,'invalid');assert.equal(h.verified,null);}
 const h=await harness();assert.equal((await h.mod.confirmEmailVerification('mfxverify_bad',now)).state,'invalid');
});
test('resend cooldown is serialized; a new requested link invalidates the previous one',async()=>{
 const h=await harness();const results=await Promise.all([h.mod.prepareEmailVerification('u','account',now),h.mod.prepareEmailVerification('u','account',now)]);assert.equal(results.filter(x=>x.state==='prepared').length,1);assert.equal(results.filter(x=>x.state==='rate_limited').length,1);
 const next=await h.mod.prepareEmailVerification('u','account',new Date(+now+61000));assert.equal((await h.mod.confirmEmailVerification(results[0].token,new Date(+now+62000))).state,'invalid');assert.equal((await h.mod.confirmEmailVerification(next.token,new Date(+now+62000))).state,'verified');
});
test('one account cannot exceed five verification requests per hour across purposes',async()=>{
 const h=await harness();for(let i=0;i<5;i++)assert.equal((await h.mod.prepareEmailVerification('u',i%2?'daily_email':'account',new Date(+now+i*61000))).state,'prepared');assert.equal((await h.mod.prepareEmailVerification('u','account',new Date(+now+6*61000))).state,'rate_limited');
});
test('Motive Daily requires explicit request plus address confirmation and current entitlement',async()=>{
 const h=await harness();const p=await h.mod.prepareEmailVerification('u','daily_email',now);assert.equal(h.consent,null);assert.equal((await h.mod.confirmEmailVerification(p.token,new Date(+now+1000))).state,'subscribed');assert.equal(h.consent.confirmedEmailHash,hash('fixture@example.invalid'));assert.equal(+h.consent.dailyEmailConsentAt,+now);assert.equal(+h.consent.dailyEmailConfirmedAt,+now+1000);
});
for(const kind of ['revoked','suppressed','downgraded'])test(`${kind} consent cannot be resurrected by an older confirmation link`,async()=>{
 const h=await harness();const p=await h.mod.prepareEmailVerification('u','daily_email',now);if(kind==='downgraded')h.setEntitled(false);else h.setConsent(kind==='revoked'?{dailyEmailRevokedAt:new Date(+now+500)}:{emailSuppressedAt:now});assert.equal((await h.mod.confirmEmailVerification(p.token,new Date(+now+1000))).state,'verified_without_subscription');assert.equal(h.consent?.dailyEmailConfirmedAt,undefined);assert.ok(h.verified);
});
test('suppressed and unentitled accounts cannot prepare daily opt-in mail',async()=>{
 const h=await harness();h.setConsent({emailSuppressedAt:now});assert.equal((await h.mod.prepareEmailVerification('u','daily_email',now)).state,'suppressed');h.setConsent(null);h.setEntitled(false);assert.equal((await h.mod.prepareEmailVerification('u','daily_email',now)).state,'not_entitled');assert.equal(h.challenges.size,0);
});
test('opt-out records revocation and suppresses queued jobs and devices',async()=>{
 const h=await harness();h.devices.set('d',{id:'d',userId:'u',revokedAt:null});await h.mod.revokeNotificationChannel('u','expo_push',now);assert.equal(+h.consent.pushRevokedAt,+now);assert.equal(+h.devices.get('d').revokedAt,+now);assert.deepEqual(Array.from(h.suppressed[0].where.state.in),['queued','retry']);
});
test('native registration requires Android permission and entitlement, never iOS paid-web unlock',async()=>{
 const h=await harness();const input={token:'ExpoPushToken[fixture123]',platform:'android',permission:'granted'};
 for(const [change,state]of [[{platform:'ios'},'unsupported_platform'],[{permission:'denied'},'permission_required'],[{token:'bad'},'permission_required']])assert.equal((await h.mod.registerPushDevice('u',{...input,...change},now)).state,state);
 h.setEntitled(false);assert.equal((await h.mod.registerPushDevice('u',input,now)).state,'not_entitled');assert.equal(h.devices.size,0);
});
test('device registration is idempotent, preserves ownership and enforces a bounded device count',async()=>{
 const h=await harness();const input={token:'ExpoPushToken[fixture123]',platform:'android',permission:'granted'};const first=await h.mod.registerPushDevice('u',input,now);const again=await h.mod.registerPushDevice('u',input,new Date(+now+1000));assert.equal(first.deviceId,again.deviceId);assert.equal(h.devices.size,1);assert.equal(+h.consent.pushConsentAt,+now);
 h.devices.get(first.deviceId).userId='other';assert.equal((await h.mod.registerPushDevice('u',input,now)).state,'ownership_conflict');
 for(let i=0;i<10;i++)h.devices.set('extra'+i,{id:'extra'+i,userId:'u',token:'other'+i,revokedAt:null});assert.equal((await h.mod.registerPushDevice('u',{...input,token:'ExpoPushToken[newtoken123]'},now)).state,'device_limit');
});
test('confirmation GET does not consume a valid token or subscribe link scanners',async()=>{
 let confirms=0;const h=await harness();const route=await loadSiteModule('../apps/site/src/app/api/auth/email-verification/confirm/route.ts',{'@/lib/notifications/onboarding':{...h.mod,confirmEmailVerification:async()=>{confirms++;return{state:'subscribed'};}}},'',{Response,FormData});
 const token='mfxverify_'+'a'.repeat(43);const result=await route.GET(new Request('https://fixture.invalid/api/auth/email-verification/confirm?token='+token));assert.equal(result.status,200);assert.equal(confirms,0);assert.equal(result.headers.get('referrer-policy'),'no-referrer');assert.match(await result.text(),/form method="post"/);
 assert.equal((await route.POST(new Request('https://fixture.invalid',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})}))).status,200);assert.equal(confirms,1);
});
test('authenticated verification endpoint rejects cross-origin and inactive requests before preparing or sending',async()=>{
 let session=null,active=false,prepared=0,sent=0;const h=await harness();const route=await loadSiteModule('../apps/site/src/app/api/auth/email-verification/route.ts',{'@motivefx/database':{prisma:{}},'@/lib/session':{getSession:async()=>session},'@/lib/notifications/onboarding':{sameOriginMutation:h.mod.sameOriginMutation,onboardingActive:()=>active,prepareEmailVerification:async()=>{prepared++;return{state:'rate_limited'};}},'@/lib/notifications/verification-email':{sendVerificationEmail:async()=>{sent++;}}},'',{Response});
 const req=origin=>new Request('https://fixture.invalid/api/auth/email-verification',{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:'{"purpose":"account"}'});
 assert.equal((await route.POST(req())).status,401);session={id:'u'};assert.equal((await route.POST(req())).status,503);active=true;assert.equal((await route.POST(req('https://other.invalid'))).status,403);assert.equal(prepared,0);assert.equal(sent,0);assert.equal((await route.POST(req('https://fixture.invalid'))).status,429);
});
