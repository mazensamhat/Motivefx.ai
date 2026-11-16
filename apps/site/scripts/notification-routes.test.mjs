import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { emailHash } from '../src/lib/notifications/policy.ts';
import { createUnsubscribeToken, readUnsubscribeToken } from '../src/lib/notifications/unsubscribe.ts';
import { dailyEventKey, deliveryKey } from '../src/lib/notifications/policy.ts';
import { verifyEmailReceipt } from '../src/lib/notifications/receipts.ts';
import { Webhook } from 'svix';

const key=Symbol.for('motivefx.notification-route-fixture');
const dependencies={}; globalThis[key]=dependencies;
async function loadRoute(name) {
  let source=await readFile(new URL(`../src/app/api/${name}/route.ts`,import.meta.url),'utf8');
  source=source.replace(/^import .*;\n/gm,'');
  source=`const {${Object.keys(dependencies).join(',')}} = globalThis[Symbol.for('motivefx.notification-route-fixture')];\n${source}`;
  return import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}#${Math.random()}`);
}
function setup(t,{enabled=false,auth={ok:true}}={}) {
  const calls=[];
  const unexpected=async()=>{calls.push('unexpected');throw Error('Unexpected dependency call');};
  Object.assign(dependencies,{
    prisma:{$transaction:unexpected,notificationConsent:{findMany:unexpected},notificationDelivery:{findMany:unexpected,groupBy:unexpected}},
    notificationStorageEnabled:()=>enabled,notificationSendingEnabled:()=>enabled,
    notificationStore:{},requireAdmin:async()=>auth,runDelivery:unexpected,sendDelivery:unexpected,
    quarantineAbandonedNotifications:unexpected,pollPushReceipts:unexpected,
    buildHomeBriefing:unexpected,planForUser:unexpected,enqueueNotification:unexpected,flushSignalEvidencePersistence:async()=>{},
    deliveryKey:unexpected,deliveryEligibility:unexpected,MAX_DELIVERY_AGE_MS:72_000_000,
    getEmailFrom:unexpected,getResendApiKey:unexpected,SITE:{url:'https://fixture.invalid'},
    createUnsubscribeToken,readUnsubscribeToken,emailHash,dailyEventKey,verifyEmailReceipt,
  });
  const originals={CRON_SECRET:process.env.CRON_SECRET,AUTH_SECRET:process.env.AUTH_SECRET,MOTIVE_NOTIFICATION_WEBHOOK_SECRET:process.env.MOTIVE_NOTIFICATION_WEBHOOK_SECRET};
  process.env.CRON_SECRET='fixture-cron-secret';process.env.AUTH_SECRET='s'.repeat(32);process.env.MOTIVE_NOTIFICATION_WEBHOOK_SECRET='whsec_'+Buffer.alloc(32,9).toString('base64');
  t.after(()=>{for(const [k,v] of Object.entries(originals)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
  return {calls};
}

for(const name of ['cron/notifications','cron/motive-daily']) {
  test(`${name} defaults off before any store or provider work`,async t=>{
    const f=setup(t);const route=await loadRoute(name);
    const response=await route.GET(new Request(`https://fixture.invalid/api/${name}`,{headers:{authorization:'Bearer fixture-cron-secret'}}));
    assert.equal(response.status,200);assert.equal((await response.json()).state,'disabled');assert.deepEqual(f.calls,[]);
  });
  test(`${name} requires cron credentials even when delivery is enabled`,async t=>{
    const f=setup(t,{enabled:true});const route=await loadRoute(name);
    assert.equal((await route.GET(new Request(`https://fixture.invalid/api/${name}`))).status,401);
    assert.deepEqual(f.calls,[]);
  });
}
test('admin activation status remains read-only with an unapplied migration',async t=>{
  const f=setup(t);const route=await loadRoute('admin/notifications');
  const response=await route.GET();assert.equal(response.status,200);
  assert.equal((await response.json()).state,'activation_required');assert.deepEqual(f.calls,[]);
});
test('admin notification status does not leak to unauthenticated callers',async t=>{
  const f=setup(t,{auth:{ok:false,status:401,error:'Unauthorized'}});const route=await loadRoute('admin/notifications');
  assert.equal((await route.GET()).status,401);assert.deepEqual(f.calls,[]);
});
test('GET unsubscribe is only a confirmation form, so link scanners never revoke consent',async t=>{
  const f=setup(t,{enabled:true});const route=await loadRoute('notifications/unsubscribe');
  const token=createUnsubscribeToken('fixture-user',emailHash('fixture@example.invalid'),process.env.AUTH_SECRET);
  const response=await route.GET(new Request(`https://fixture.invalid/api/notifications/unsubscribe?token=${token}`));
  assert.equal(response.status,200);assert.match(await response.text(),/method="post"/);assert.deepEqual(f.calls,[]);
});
test('unsubscribe POST fails closed before writes for an invalid token or disabled storage',async t=>{
  const f=setup(t);let route=await loadRoute('notifications/unsubscribe');
  assert.equal((await route.POST(new Request('https://fixture.invalid/api/notifications/unsubscribe?token=bad',{method:'POST'}))).status,503);
  dependencies.notificationStorageEnabled=()=>true;route=await loadRoute('notifications/unsubscribe');
  assert.equal((await route.POST(new Request('https://fixture.invalid/api/notifications/unsubscribe?token=bad',{method:'POST'}))).status,400);
  assert.deepEqual(f.calls,[]);
});
test('daily pagination ends on an empty final page instead of returning the input cursor forever',async t=>{
  const f=setup(t,{enabled:true});dependencies.prisma.notificationConsent.findMany=async()=>[];
  const route=await loadRoute('cron/motive-daily');
  const response=await route.GET(new Request('https://fixture.invalid/api/cron/motive-daily?cursor=last-user',{headers:{authorization:'Bearer fixture-cron-secret'}}));
  const body=await response.json();assert.equal(body.nextCursor,null);assert.equal(body.queued,0);assert.deepEqual(f.calls,[]);
});


function emailWebhookRequest(type='email.bounced',tagged=true) {
  const id='msg_route_fixture', at=new Date();
  const key=deliveryKey('daily_email','fixture-user','daily:2026-11-16',emailHash('fixture@example.invalid'));
  const body=JSON.stringify({type,data:{email_id:'provider-fixture',tags:tagged?{motive_notification:key}:{other_product:'life'}}});
  return new Request('https://fixture.invalid/api/webhooks/notification-email',{method:'POST',body,headers:{'svix-id':id,'svix-timestamp':String(Math.floor(at.getTime()/1000)),'svix-signature':new Webhook(process.env.MOTIVE_NOTIFICATION_WEBHOOK_SECRET).sign(id,at,body)}});
}
function receiptStoreFixture(initialState='accepted') {
  const state={delivery:initialState,receipt:null,suppressed:false,queueSuppressed:false};
  dependencies.prisma.$transaction=async work=>work({
    notificationDelivery:{
      findFirst:async()=>({key:'fixture-job',userId:'fixture-user'}),
      updateMany:async({where,data})=>{
        if(where.key) { if(!where.state?.notIn?.includes(state.delivery))state.delivery=data.state; }
        else state.queueSuppressed=true;
        return {count:1};
      },
    },
    notificationReceipt:{create:async({data})=>{if(state.receipt)throw Object.assign(new Error('duplicate'),{code:'P2002'});state.receipt=data;}},
    notificationConsent:{upsert:async()=>{state.suppressed=true;}},
  });
  return state;
}
test('verified complaints atomically suppress future deliveries and duplicate receipts do not repeat work',async t=>{
  setup(t,{enabled:true});const state=receiptStoreFixture();const route=await loadRoute('webhooks/notification-email');
  const request=emailWebhookRequest('email.complained');
  assert.equal((await route.POST(request.clone())).status,200);
  assert.equal(state.delivery,'suppressed');assert.equal(state.suppressed,true);assert.equal(state.queueSuppressed,true);
  assert.deepEqual(Object.keys(state.receipt).sort(),['eventType','id','provider','providerId']);
  assert.equal((await (await route.POST(request.clone())).json()).duplicate,true);
});
test('late failed receipt cannot overwrite a confirmed provider delivery',async t=>{
  setup(t,{enabled:true});const state=receiptStoreFixture('provider_confirmed');const route=await loadRoute('webhooks/notification-email');
  assert.equal((await route.POST(emailWebhookRequest('email.failed'))).status,200);
  assert.equal(state.delivery,'provider_confirmed');assert.equal(state.suppressed,false);
});
test('shared-account messages without the MotiveFX delivery tag never access notification storage',async t=>{
  const f=setup(t,{enabled:true});const route=await loadRoute('webhooks/notification-email');
  assert.equal((await (await route.POST(emailWebhookRequest('email.bounced',false))).json()).ignored,true);assert.deepEqual(f.calls,[]);
});
test('unsigned notification webhooks are rejected before any database work',async t=>{
  const f=setup(t,{enabled:true});const route=await loadRoute('webhooks/notification-email');
  assert.equal((await route.POST(new Request('https://fixture.invalid/api/webhooks/notification-email',{method:'POST',body:'{}'}))).status,400);assert.deepEqual(f.calls,[]);
});
