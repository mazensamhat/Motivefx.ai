import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { Webhook } from 'svix';
import { deliveryEligibility, deliveryKey, dailyEventKey, emailHash, MAX_DELIVERY_AGE_MS, retryAt, safeNotificationContent } from '../src/lib/notifications/policy.ts';
import { createUnsubscribeToken, readUnsubscribeToken } from '../src/lib/notifications/unsubscribe.ts';

// Native Node resolution requires .ts; transpile actual modules and replace only
// the relative import specifiers. Provider calls are replaced by test doubles.
async function load(path) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  source = source.replaceAll('from "svix"', `from ${JSON.stringify(import.meta.resolve('svix'))}`);
  source = source.replaceAll('from "./policy"', `from ${JSON.stringify(new URL('../src/lib/notifications/policy.ts', import.meta.url).href)}`);
  return import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
}
const { runDelivery } = await load('../src/lib/notifications/worker.ts');
const { sendDelivery, renderDailyEmail } = await load('../src/lib/notifications/transports.ts');
const now = Date.parse('2026-11-16T12:00:00Z');
const address = 'fixture@example.invalid';
const targetRef = emailHash(address);
const job = { key: deliveryKey('daily_email', 'user-fixture', dailyEventKey('2026-11-16'), targetRef), userId: 'user-fixture', channel: 'daily_email', eventKey: 'daily:2026-11-16', targetRef,
  content: { title: 'Motive Daily', body: 'Evidence strength, not forecast probability.', path: '/terminal/' }, createdAt: now - 60_000, expiresAt: now + MAX_DELIVERY_AGE_MS - 60_000, attempts: 0 };
const recipient = { userId: job.userId, disabled: false, entitled: true, consentAt: now - 100_000, revokedAt: null, suppressed: false, targetRef, email: address, emailConfirmedAt: now - 80_000, confirmedEmailHash: targetRef };
const mailOptions = { enabled: true, resendApiKey: 'test-key', from: 'MotiveFX <fixture@example.invalid>', appUrl: 'https://fixture.invalid', unsubscribeUrl: 'https://fixture.invalid/api/notifications/unsubscribe?token=fixture', postalAddress: 'Fixture address' };

test('business-event idempotency is stable and separates recipient, channel, day and device', () => {
  assert.equal(deliveryKey('daily_email', job.userId, job.eventKey, targetRef), job.key);
  const variants = [deliveryKey('daily_email', 'another-user', job.eventKey, targetRef), deliveryKey('expo_push', job.userId, job.eventKey, targetRef), deliveryKey('daily_email', job.userId, 'daily:2026-11-17', targetRef), deliveryKey('daily_email', job.userId, job.eventKey, 'other-device')];
  assert.ok(variants.every(key => key !== job.key));
  assert.equal(new Set(variants).size, 4);
  assert.throws(() => dailyEventKey('2026-02-30'));
  assert.throws(() => dailyEventKey('2026-11-16T12:00:00Z'));
});

for (const [change, reason] of [
  [{disabled:true}, 'account_disabled'], [{entitled:false}, 'not_entitled'],
  [{suppressed:true}, 'recipient_suppressed'], [{consentAt:null}, 'consent_required'],
  [{revokedAt:now}, 'consent_revoked'], [{targetRef:'changed'}, 'target_changed'],
  [{emailConfirmedAt:null}, 'confirmed_consent_required'],
  [{emailConfirmedAt:now - 200_000}, 'confirmed_consent_required'],
  [{email:'new@example.invalid'}, 'confirmed_consent_required'],
]) test(`dispatch blocks ${reason} even if a job was previously queued`, () => assert.equal(deliveryEligibility(job, {...recipient,...change}, now), reason));

test('eligible means confirmed consent, entitlement and an unexpired event', () => {
  assert.equal(deliveryEligibility(job, recipient, now), null);
  assert.equal(deliveryEligibility({...job,expiresAt:now}, recipient, now), 'event_expired');
  assert.equal(deliveryEligibility({...job,createdAt:now-MAX_DELIVERY_AGE_MS}, recipient, now), 'event_expired');
  assert.equal(deliveryEligibility({...job,attempts:4}, recipient, now), 'attempt_limit');
  assert.equal(deliveryEligibility(job, null, now), 'recipient_unavailable');
});

function workerFixture(response = {kind:'accepted',providerId:'provider-fixture'}, currentRecipient = recipient) {
  let claimed = false;
  const calls = [], completed = [];
  const store = {
    claim: async () => { calls.push('claim'); if (claimed) return null; claimed = true; return {...job,attempts:1}; },
    loadRecipient: async () => { calls.push('recipient'); return currentRecipient; },
    finish: async (key, attempt, result) => completed.push({key,attempt,result}),
    revokeDevice: async () => calls.push('revoke'),
  };
  return {calls,completed,dependencies:{enabled:true,now:()=>now,store,send:async()=>{calls.push('send');return response;}}};
}

test('disabled worker does no storage or provider work', async () => {
  const f=workerFixture();
  assert.deepEqual(await runDelivery(job.key,{...f.dependencies,enabled:false}),{state:'disabled'});
  assert.deepEqual(f.calls,[]);
});
test('competing dispatchers get one claim and one provider send', async () => {
  const f=workerFixture();
  const results=await Promise.all([runDelivery(job.key,f.dependencies),runDelivery(job.key,f.dependencies)]);
  assert.equal(f.calls.filter(x=>x==='send').length,1);
  assert.ok(results.some(x=>x.state==='accepted'));
  assert.ok(results.some(x=>x.state==='not_claimed'));
  assert.equal(f.completed[0].result.state,'accepted', 'provider acknowledgment is not delivered');
});
test('consent revoked after enqueue stops dispatch',async()=>{
  const f=workerFixture(undefined,{...recipient,revokedAt:now});
  assert.deepEqual(await runDelivery(job.key,f.dependencies),{state:'suppressed',code:'consent_revoked'});
  assert.ok(!f.calls.includes('send'));
});
test('uncertain delivery stays unknown, without automatic retry',async()=>{
  const f=workerFixture({kind:'unknown',code:'push_acceptance_unknown'});
  assert.deepEqual(await runDelivery(job.key,f.dependencies),{state:'unknown',code:'push_acceptance_unknown'});
});
test('device rejection revokes endpoint before completing the delivery',async()=>{
  const f=workerFixture({kind:'revoke_device',code:'device_not_registered'});
  assert.equal((await runDelivery(job.key,f.dependencies)).state,'suppressed');
  assert.ok(f.calls.includes('revoke'));
});
test('bounded retries never outlive the provider idempotency window',async()=>{
  const f=workerFixture({kind:'retry',code:'email_http_503'});
  const result=await runDelivery(job.key,f.dependencies);
  assert.equal(result.state,'retry');
  assert.equal(result.nextAttemptAt,now+60_000);
  assert.equal(retryAt({...job,attempts:4},now),null);
  assert.equal(retryAt({...job,expiresAt:now+30_000},now),null);
});

test('email renders escaped content, plain text and one-click unsubscribe headers',()=>{
  const email=renderDailyEmail({...job,content:{...job.content,title:'<unsafe>',body:'<script>alert(1)</script>'}},mailOptions);
  assert.match(email.html,/&lt;unsafe&gt;/);
  assert.doesNotMatch(email.html,/<script>/);
  assert.match(email.text,/Unsubscribe:/);
  assert.equal(email.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
  assert.throws(()=>renderDailyEmail(job,{...mailOptions,unsubscribeUrl:'https://other.invalid/'}));
  assert.throws(()=>safeNotificationContent({...job.content,path:'//other.invalid/'}));
  assert.throws(()=>safeNotificationContent({...job.content,path:'/\\other.invalid/'}));
});

test('disabled transport cannot send even with credentials supplied',async()=>{
  let calls=0;
  assert.deepEqual(await sendDelivery(job,recipient,{...mailOptions,enabled:false,fetcher:async()=>{calls++;throw Error();}}),{kind:'failed',code:'delivery_disabled'});
  assert.equal(calls,0);
});
test('email retries reuse the exact key and payload',async()=>{
  const requests=[];
  const options={...mailOptions,fetcher:async(url,init)=>{requests.push({url,init});return Response.json({id:'mail-fixture'});}};
  assert.equal((await sendDelivery(job,recipient,options)).kind,'accepted');
  assert.equal((await sendDelivery({...job,attempts:1},recipient,options)).kind,'accepted');
  assert.equal(requests[0].init.headers['Idempotency-Key'],job.key);
  assert.equal(requests[0].init.body,requests[1].init.body);
  assert.ok(requests[0].init.signal instanceof AbortSignal);
});
for(const [status,kind] of [[429,'retry'],[503,'retry'],[400,'failed'],[401,'failed']]) test(`email HTTP ${status} is ${kind}`,async()=>{
  assert.equal((await sendDelivery(job,recipient,{...mailOptions,fetcher:async()=>new Response('',{status})})).kind,kind);
});
test('push timeout is unknown and stale device ticket requests revocation',async()=>{
  const pushJob={...job,channel:'expo_push'};
  const pushRecipient={...recipient,pushToken:'ExponentPushToken[fixture]'};
  assert.equal((await sendDelivery(pushJob,pushRecipient,{enabled:true,fetcher:async()=>{throw Error('timeout');}})).kind,'unknown');
  assert.equal((await sendDelivery(pushJob,pushRecipient,{enabled:true,fetcher:async()=>Response.json({data:{status:'error',details:{error:'DeviceNotRegistered'}}})})).kind,'revoke_device');
});
test('unsubscribe token is stable, scoped and tamper-evident',()=>{
  const secret='a'.repeat(32);
  const token=createUnsubscribeToken(job.userId,targetRef,secret);
  assert.equal(createUnsubscribeToken(job.userId,targetRef,secret),token);
  assert.deepEqual(readUnsubscribeToken(token,secret),{userId:job.userId,emailHash:targetRef});
  assert.equal(readUnsubscribeToken(token,'b'.repeat(32)),null);
  assert.equal(readUnsubscribeToken(token+'x',secret),null);
  assert.equal(readUnsubscribeToken(token,''),null);
});


const { verifyEmailReceipt, classifyPushReceipt } = await load('../src/lib/notifications/receipts.ts');
const webhookSecret = 'whsec_' + Buffer.alloc(32, 7).toString('base64');
function signedReceipt(type, data = {}, timestamp = new Date()) {
  const id = 'msg_fixture';
  const body = JSON.stringify({type, data:{email_id:'mail-fixture',tags:{motive_notification:job.key},...data}});
  return {body,headers:new Headers({'svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':new Webhook(webhookSecret).sign(id,timestamp,body)})};
}

test('real Svix verification rejects tampered or stale receipt bodies before processing',()=>{
  const r=signedReceipt('email.delivered');
  assert.equal(verifyEmailReceipt(r.body,r.headers,webhookSecret).state,'provider_confirmed');
  assert.throws(()=>verifyEmailReceipt(r.body+' ',r.headers,webhookSecret));
  const old=signedReceipt('email.delivered',{},new Date(Date.now()-600_000));
  assert.throws(()=>verifyEmailReceipt(old.body,old.headers,webhookSecret));
});

test('bounce and complaint receipts suppress future mail; other shared-account messages are ignored',()=>{
  for(const type of ['email.bounced','email.complained','email.suppressed']) {
    const r=signedReceipt(type);
    const receipt=verifyEmailReceipt(r.body,r.headers,webhookSecret);
    assert.equal(receipt.suppress,true);
    assert.equal(receipt.state,'suppressed');
    assert.equal(receipt.deliveryKey,job.key);
  }
  const unrelated=signedReceipt('email.delivered',{tags:{other_product:'true'}});
  assert.equal(verifyEmailReceipt(unrelated.body,unrelated.headers,webhookSecret),null);
  const opened=signedReceipt('email.opened');
  assert.equal(verifyEmailReceipt(opened.body,opened.headers,webhookSecret),null);
});

test('push receipts never claim device display and missing receipts remain pending',()=>{
  assert.equal(classifyPushReceipt({status:'ok'}),'provider_confirmed');
  assert.equal(classifyPushReceipt({status:'error',details:{error:'DeviceNotRegistered'}}),'revoke_device');
  assert.equal(classifyPushReceipt({status:'error'}),'failed');
  assert.equal(classifyPushReceipt(undefined),'pending');
});
