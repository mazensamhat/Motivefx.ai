import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';
const crypto = siteRequire('node:crypto');
const Stripe = siteRequire('stripe');
const tiers = await loadSiteModule('../apps/site/src/lib/tiers.ts');
const baseUser = {id:'u',stripeCustomerId:'cus_fixture',stripeSubscriptionId:null,subscriptionStatus:'none',billingProvider:null,passwordHash:null,disabledAt:null,email:'fixture@example.invalid'};
const baseSub = {id:'sub_fixture',customer:'cus_fixture',created:100,status:'active',latest_invoice:'in_fixture',metadata:{userId:'u',tier:'pro',selectedMarkets:'["stocks","crypto"]'}};
async function harness(changes={}) {
  let user={...baseUser,...changes}; const subs=new Map([[baseSub.id,structuredClone(baseSub)]]), receipts=new Map(), invalidations=[], queries=[];
  let reads=0, writes=0, tail=Promise.resolve(), failRead=false;
  const tx={
    $queryRaw:async (parts,...values)=>{
      const sql=parts.join('?'); queries.push(sql);
      if(sql.includes('FOR UPDATE')) return [{id:user.id}];
      return [...receipts.values()].filter(x=>x.action==='billing.stripe.reconciled'&&x.result==='applied').sort((a,b)=>JSON.parse(b.afterJson).subscriptionCreated-JSON.parse(a.afterJson).subscriptionCreated).slice(0,1);
    },
    user:{findUnique:async()=>user,update:async({data})=>{writes++;user={...user,...data};return user;}},
    opsAuditEvent:{findUnique:async({where})=>receipts.get(where.id)??null,create:async({data})=>{if(receipts.has(data.id))throw Object.assign(Error('duplicate'),{code:'P2002'});receipts.set(data.id,data);return data;}}
  };
  const prisma={...tx,user:{...tx.user,findMany:async()=>[{id:user.id,stripeCustomerId:user.stripeCustomerId}]},$transaction:fn=>{
    const run=tail.then(async()=>{const oldUser=structuredClone(user),oldReceipts=new Map(receipts);try{return await fn(tx);}catch(e){user=oldUser;receipts.clear();for(const [k,v]of oldReceipts)receipts.set(k,v);throw e;}});tail=run.catch(()=>{});return run;
  }};
  const stripe={invoices:{retrieve:async()=>({id:'in_fixture',status:'paid'})},subscriptions:{retrieve:async id=>{reads++;if(failRead)throw Error('provider unavailable');return structuredClone(subs.get(id));}}};
  const mod=await loadSiteModule('../apps/site/src/lib/stripe-reconciliation.ts',{'crypto':crypto,'@motivefx/database':{prisma},'./load-user':{invalidateUserCache:id=>invalidations.push(id)},'./tiers':tiers});
  return {mod,stripe,subs,receipts,queries,invalidations,prisma,get user(){return user;},get reads(){return reads;},get writes(){return writes;},failRead:()=>{failRead=true;},setUser:x=>{user={...user,...x};}};
}

test('checkout only fulfills completed paid/no-payment-required subscriptions',async()=>{
  const {mod}=await harness();const good={mode:'subscription',status:'complete',payment_status:'paid'};
  assert.equal(mod.checkoutMayFulfill(good),true);
  assert.equal(mod.checkoutMayFulfill({...good,payment_status:'no_payment_required'}),true);
  for(const change of [{payment_status:'unpaid'},{status:'open'},{status:'expired'},{mode:'payment'},{payment_status:null}])assert.equal(mod.checkoutMayFulfill({...good,...change}),false);
});
test('current provider state overrides an old active event and exact duplicate writes only once',async()=>{
  const h=await harness({stripeSubscriptionId:baseSub.id,billingProvider:'stripe',subscriptionStatus:'active'});
  h.subs.get(baseSub.id).status='canceled';
  await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_old_active');
  assert.equal(h.user.stripeSubscriptionId,null);assert.equal(h.user.subscriptionStatus,'none');
  await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_old_active');
  assert.equal(h.writes,1);assert.equal(h.receipts.size,1);assert.equal(h.invalidations.length,1);
});
test('simultaneous duplicate delivery serializes current reads and one entitlement update',async()=>{
  const h=await harness();const results=await Promise.all([h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_same'),h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_same')]);
  assert.equal(h.writes,1);assert.equal(results.filter(x=>x.duplicate).length,1);assert.equal(h.user.intelligenceTier,'pro');
  assert.ok(h.queries.filter(x=>x.includes('FOR UPDATE')).length===2);assert.equal(h.reads,4);
});
for(const [label,change]of [['comp',{subscriptionStatus:'comp'}],['operator pause',{subscriptionStatus:'paused'}],['Apple',{billingProvider:'apple',subscriptionStatus:'active'}]])test(`${label} ownership survives Stripe event`,async()=>{
  const h=await harness(change);await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_ownership');assert.equal(h.writes,0);assert.equal(h.receipts.values().next().value.result,'ignored');
});
test('old subscription cannot overwrite a newer subscription, including after cancellation clears current ID',async()=>{
  const h=await harness();h.subs.set('sub_new',{...structuredClone(baseSub),id:'sub_new',created:200});
  await h.mod.reconcileStripeSubscription(h.stripe,'sub_new','evt_new');
  await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_old');assert.equal(h.user.stripeSubscriptionId,'sub_new');
  h.subs.get('sub_new').status='canceled';await h.mod.reconcileStripeSubscription(h.stripe,'sub_new','evt_cancel');assert.equal(h.user.stripeSubscriptionId,null);
  await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_very_late');assert.equal(h.user.stripeSubscriptionId,null);assert.equal(h.writes,2);
});
test('first reconciliation respects an already attached newer subscription',async()=>{
  const h=await harness({billingProvider:'stripe',stripeSubscriptionId:'sub_new',subscriptionStatus:'active'});
  h.subs.set('sub_new',{...structuredClone(baseSub),id:'sub_new',created:200});
  await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_old');assert.equal(h.writes,0);
});
test('metadata cannot transfer customer ownership and failed reads leave receipt retryable',async()=>{
  const h=await harness();h.subs.get(baseSub.id).metadata.userId='other';
  await assert.rejects(h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_bad'),/owner_mismatch/);assert.equal(h.writes,0);assert.equal(h.receipts.size,0);
  h.subs.get(baseSub.id).metadata.userId='u';h.failRead();await assert.rejects(h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_bad'));assert.equal(h.receipts.size,0);
});
test('unknown tiers and invalid market picks fail without entitlement writes',async()=>{
  for(const metadata of [{tier:'admin',selectedMarkets:'[]'},{tier:'pro',selectedMarkets:'["unknown"]'}]){
    const h=await harness();h.subs.get(baseSub.id).metadata={userId:'u',...metadata};await assert.rejects(h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_invalid'));assert.equal(h.writes,0);assert.equal(h.receipts.size,0);
  }
});
test('past-due grace policy is preserved; definitive inactive state only affects attached Stripe subscription',async()=>{
  const h=await harness({billingProvider:'stripe',stripeSubscriptionId:baseSub.id,subscriptionStatus:'active'});
  h.subs.get(baseSub.id).status='past_due';await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_due');assert.equal(h.writes,0);
  h.subs.get(baseSub.id).status='unpaid';await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_unpaid');assert.equal(h.user.subscriptionStatus,'none');
});
test('risk events are deduplicated review evidence, not automatic refund/access changes',async()=>{
  const h=await harness();const event={id:'evt_risk',type:'charge.refunded',livemode:false,data:{object:{id:'ch_fixture',object:'charge',customer:'private'}}};
  await h.mod.recordStripeRiskEvent(event);await h.mod.recordStripeRiskEvent(event);assert.equal(h.receipts.size,1);assert.equal(h.writes,0);assert.equal(JSON.stringify([...h.receipts.values()]).includes('private'),false);
});

test('checkout account setup claims once across concurrent calls and preserves ambiguous delivery',async()=>{
  const rows=new Map();let issued=0,sent=0;
  const prisma={passwordResetToken:{create:async()=>{}},user:{findUnique:async()=>baseUser},opsAuditEvent:{findFirst:async()=>null,create:async({data})=>{if(rows.has(data.id))throw Object.assign(Error('duplicate'),{code:'P2002'});rows.set(data.id,data);},update:async({where,data})=>rows.set(where.id,{...rows.get(where.id),...data})}};
  const setup=await loadSiteModule('../apps/site/src/lib/checkout-account-setup.ts',{'crypto':crypto,'@motivefx/database':{prisma},'./password-reset':{createPasswordResetToken:()=>{issued++;return{token:'fixture',tokenHash:'fixture-hash'};}},'./account-setup-email':{sendAccountSetupEmail:async()=>{sent++;throw Error('ambiguous transport');}}});
  await Promise.all([setup.sendCheckoutAccountSetup('u','cs_fixture'),setup.sendCheckoutAccountSetup('u','cs_fixture')]);
  await setup.sendCheckoutAccountSetup('u','cs_fixture');assert.equal(issued,1);assert.equal(sent,1);assert.equal([...rows.values()][0].result,'delivery_unknown');
});

test('webhook validates actual raw signatures and paid session before reconciliation',async t=>{
  const old=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_WEBHOOK_SECRET='fixture-webhook-signing-secret';t.after(()=>{if(old===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=old;});
  const client=new Stripe('sk_test_fixture_not_a_real_key');let session={id:'cs_fixture',mode:'subscription',status:'complete',payment_status:'unpaid',subscription:'sub_fixture'},calls=0,mails=0;
  const route=await loadSiteModule('../apps/site/src/app/api/webhooks/stripe/route.ts',{'@/lib/stripe':{getStripe:()=>({webhooks:client.webhooks,checkout:{sessions:{retrieve:async()=>session}}})},'@/lib/api':{json:(body,status=200)=>({body,status}),serverError:error=>({status:500,body:{error}})},'@/lib/stripe-reconciliation':{checkoutMayFulfill:(await harness()).mod.checkoutMayFulfill,stripeObjectId:v=>v,reconcileStripeSubscription:async()=>{calls++;return{activated:true,userId:'u'};},recordStripeRiskEvent:async()=>{}},'@/lib/checkout-account-setup':{sendCheckoutAccountSetup:async()=>{mails++;}}});
  const event={id:'evt_checkout',type:'checkout.session.completed',data:{object:{id:'cs_fixture',payment_status:'paid'}}};const raw=JSON.stringify(event);
  const header=client.webhooks.generateTestHeaderString({payload:raw,secret:process.env.STRIPE_WEBHOOK_SECRET});
  const req=body=>new Request('https://fixture.invalid',{method:'POST',body,headers:{'stripe-signature':header}});
  assert.equal((await route.POST(req(raw+' '))).status,400);assert.equal(calls,0);
  assert.equal((await route.POST(req(raw))).status,200);assert.equal(calls,0);
  session={...session,payment_status:'paid'};assert.equal((await route.POST(req(raw))).status,200);assert.equal(calls,1);assert.equal(mails,1);
});
test('restricted Stripe server keys are accepted without exposing or replacing credentials',async()=>{
  const stripe=await loadSiteModule('../apps/site/src/lib/stripe.ts',{'stripe':Stripe});
  for(const prefix of ['rk_live_','rk_test_','sk_live_','sk_test_'])assert.equal(stripe.isValidStripeSecretKey(prefix+'fixture_only_123456789'),true);
  for(const prefix of ['pk_live_','whsec_'])assert.equal(stripe.isValidStripeSecretKey(prefix+'fixture_only_123456789'),false);
});

test('active subscription with unconfirmed first invoice does not grant access until payment settles',async()=>{
  const h=await harness();h.stripe.invoices.retrieve=async()=>({status:'open'});
  await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_initial');assert.equal(h.writes,0);
  h.stripe.invoices.retrieve=async()=>({status:'paid'});
  await h.mod.reconcileStripeSubscription(h.stripe,baseSub.id,'evt_invoice_paid');assert.equal(h.writes,1);
});
