import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`;
const observations=await readFile(new URL('../src/lib/ops/social-observation.ts',import.meta.url),'utf8');
const observationUrl=dataModule(observations);
const {observedMetrics,metaProfileObservation}=await import(observationUrl);
const db={};globalThis.__socialSyncTestDb=db;
const source=(await readFile(new URL('../src/lib/ops/social-provider-sync.ts',import.meta.url),'utf8'))
  .replace('import { prisma } from "@motivefx/database";','const prisma=globalThis.__socialSyncTestDb;')
  .replace('from "./social-observation"',`from ${JSON.stringify(observationUrl)}`);
const {syncSocialProviders}=await import(dataModule(source));

test('missing observations remain unknown while measured zero remains zero',()=>{
  const row={followers:0,impressions:0,profileViews:0,linkClicks:0,engagementRate:0,postsCount:0};
  assert.ok(Object.values(observedMetrics(row)).every(value=>value===null));
  assert.deepEqual(observedMetrics({...row,rawJson:JSON.stringify({availableMetrics:['followers','postsCount']})}),{
    followers:0,postsCount:0,impressions:null,profileViews:null,linkClicks:null,engagementRate:null,
  });
  assert.throws(()=>metaProfileObservation('instagram','42',{id:'43',followers_count:20}),/did not match/);
});

function setup(t,channels,response,previousSnapshot=null){
  const writes=[],requests=[],credentialUpdates=[];
  db.marketingChannel={findMany:async()=>channels};
  db.socialMetricsSnapshot={findUnique:async()=>previousSnapshot,upsert:args=>{writes.push(args);return Promise.resolve(args);}};
  db.socialChannelCredential={update:args=>{credentialUpdates.push(args);return Promise.resolve(args);}};
  db.$transaction=async args=>Promise.all(args);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async (url,init)=>{requests.push({url:String(url),init});return response;};
  t.after(()=>{globalThis.fetch=originalFetch;});
  return {writes,requests,credentialUpdates};
}
const connected={id:'instagram-motivefx-ai',platform:'Instagram',credentials:{accountId:'42',accessToken:'test-private-token'}};

test('disconnected and unsupported channels never send provider requests or fabricate snapshots',async t=>{
  const state=setup(t,[{id:'missing',platform:'Instagram',credentials:null},{...connected,id:'revoked',credentials:{...connected.credentials,connectionStatus:'revoked'}},{id:'linkedin',platform:'LinkedIn',credentials:null}],null);
  const result=await syncSocialProviders();
  assert.equal(result.synced,0);assert.equal(state.requests.length,0);assert.equal(state.writes.length,0);
  assert.deepEqual(result.results.map(row=>row.status),['disconnected','disconnected','unsupported']);
});

test('real company-account observations use bounded authenticated reads and idempotent daily upserts',async t=>{
  const state=setup(t,[connected],new Response(JSON.stringify({id:'42',followers_count:0,media_count:5})));
  const result=await syncSocialProviders();
  assert.equal(result.synced,1);assert.equal(state.writes.length,1);
  const request=state.requests[0];assert.equal(new URL(request.url).hostname,'graph.facebook.com');
  assert.ok(!request.url.includes('test-private-token'));assert.equal(request.init.headers.Authorization,'Bearer test-private-token');
  assert.ok(request.init.signal instanceof AbortSignal);
  const write=state.writes[0];assert.equal(write.where.channelId_snapshotDate.channelId,connected.id);
  assert.equal(write.create.followers,0);assert.equal(write.create.postsCount,5);
  assert.equal(write.create.impressions,undefined);
  const raw=JSON.parse(write.create.rawJson);assert.deepEqual(raw.availableMetrics,['followers','postsCount']);
  assert.ok(!write.create.rawJson.includes('test-private-token'));
  assert.equal(state.credentialUpdates[0].data.connectionStatus,'connected');
});

test('partial Meta refreshes preserve same-day observed metric provenance without overwriting omitted fields',async t=>{
  const facebook={id:'facebook-motivefx-ai',platform:'Facebook',credentials:{accountId:'42',accessToken:'test-private-token'}};
  const previous={rawJson:JSON.stringify({availableMetrics:['followers','postsCount','impressions']})};
  const state=setup(t,[facebook],new Response(JSON.stringify({id:'42',followers_count:1250})),previous);
  const result=await syncSocialProviders();
  assert.equal(result.synced,1);assert.equal(state.writes.length,1);
  const write=state.writes[0];
  assert.equal(write.create.followers,1250);
  assert.equal(write.create.postsCount,undefined);
  assert.equal(write.update.followers,1250);
  assert.equal(write.update.postsCount,undefined);
  assert.equal(write.update.impressions,undefined);
  assert.deepEqual(JSON.parse(write.update.rawJson).availableMetrics,['followers','postsCount','impressions']);
});

test('provider denial preserves earlier observations and records no secret response body',async t=>{
  const state=setup(t,[connected],new Response('private-provider-error-token',{status:403}));
  const result=await syncSocialProviders();
  assert.equal(result.synced,0);assert.equal(state.writes.length,0);
  assert.match(result.results[0].error,/HTTP 403/);
  assert.ok(!JSON.stringify(result).includes('private-provider-error-token'));
  assert.equal(state.credentialUpdates[0].data.lastSyncAt,undefined);
});

test('an account mismatch cannot overwrite a connected company channel',async t=>{
  const state=setup(t,[connected],new Response(JSON.stringify({id:'99',followers_count:999})));
  const result=await syncSocialProviders();assert.equal(result.synced,0);assert.equal(state.writes.length,0);
});

test('scheduled sync requires the existing cron secret and reports disconnected accounts as unavailable',async t=>{
  const state=setup(t,[{id:'missing',platform:'Instagram',credentials:null}],null);
  const originalSecret=process.env.CRON_SECRET;process.env.CRON_SECRET='fixture-cron-secret';
  t.after(()=>{if(originalSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=originalSecret;});
  const routeSource=(await readFile(new URL('../src/app/api/cron/social-metrics/route.ts',import.meta.url),'utf8'))
    .replace('import { syncSocialProviders } from "@/lib/ops/social-provider-sync";',`import { syncSocialProviders } from ${JSON.stringify(dataModule(source))};`);
  const {GET}=await import(dataModule(routeSource));
  assert.equal((await GET(new Request('https://fixture.test/api/cron/social-metrics'))).status,401);
  const response=await GET(new Request('https://fixture.test/api/cron/social-metrics',{headers:{authorization:'Bearer fixture-cron-secret'}}));
  assert.equal(response.status,503);assert.equal((await response.json()).ok,false);
  assert.equal(state.requests.length,0);assert.equal(state.writes.length,0);
});
