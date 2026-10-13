import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';
const crypto = siteRequire('node:crypto');
const jose = await import(pathToFileURL(siteRequire.resolve('jose')).href);
const plain = value => JSON.parse(JSON.stringify(value));

test('opaque auth tokens store hashes, enforce purpose and allow only one concurrent claim', async () => {
  const rows = new Map();
  const table = {
    create: async ({data}) => rows.set(data.tokenHash, {id: data.tokenHash, ...data}),
    findUnique: async ({where}) => rows.get(where.tokenHash) ?? null,
    deleteMany: async ({where}) => ({count: rows.delete(where.tokenHash ?? where.id) ? 1 : 0}),
  };
  const auth = await loadSiteModule('../apps/site/src/lib/one-time-auth.ts', {
    crypto, '@motivefx/database': {prisma: {passwordResetToken: table, $transaction: fn => fn({passwordResetToken: table})}},
  });
  const token = await auth.issueOneTimeAuthToken('user', 'native_handoff', 120);
  assert.match(token, /^mfxhandoff_[A-Za-z0-9_-]{43}$/);
  assert.equal([...rows.values()].some(r => r.tokenHash.includes(token)), false);
  assert.equal(await auth.consumeOneTimeAuthToken(token, 'pending_2fa'), null);
  const claims = await Promise.all([auth.consumeOneTimeAuthToken(token, 'native_handoff'), auth.consumeOneTimeAuthToken(token, 'native_handoff')]);
  assert.deepEqual(claims.sort(), [null, 'user'].sort());
  assert.equal(await auth.consumeOneTimeAuthToken(token, 'native_handoff'), null);
  const expired = await auth.issueOneTimeAuthToken('user', 'pending_2fa', -1);
  assert.equal(await auth.consumeOneTimeAuthToken(expired, 'pending_2fa'), null);
  assert.equal(rows.size, 0);
});

test('refresh credentials bind password, TOTP and current account availability', async t => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'qa-only-signing-secret-for-session-regression';
  t.after(() => { if (previous === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous; });
  let user = {id:'user', email:'canonical@example.test', passwordHash:'hash', totpSecret:null, totpEnabled:false, disabledAt:null, updatedAt:new Date(0)};
  const session = await loadSiteModule('../apps/site/src/lib/session.ts', {
    crypto, jose, '@motivefx/database':{prisma:{user:{findUnique:async()=>user}}},
    'next/headers':{cookies:async()=>({set(){}}), headers:async()=>new Headers()},
  });
  const pair = await session.createSessionPair({id:'user',email:'old@example.test'});
  assert.equal((await session.refreshSessionTokens(pair.refreshToken)).user.email, 'canonical@example.test');
  assert.equal(await session.refreshSessionTokens(pair.accessToken), null);
  for (const change of [{passwordHash:'changed'},{totpEnabled:true},{totpSecret:'changed'},{disabledAt:new Date()}]) {
    const old = user; user = {...user,...change};
    assert.equal(await session.refreshSessionTokens(pair.refreshToken), null); user = old;
  }
  const legacy = await new jose.SignJWT({sub:'user',email:user.email}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  assert.ok(await session.refreshSessionTokens(legacy));
  user = {...user, updatedAt:new Date(Date.now()+10_000)};
  assert.equal(await session.refreshSessionTokens(legacy), null);
  assert.equal(await session.refreshSessionTokens('tampered'), null);
});

test('durable auth throttles hash identifiers, scope attempts and stop writes at the limit', async () => {
  let count = 0; const writes = [], queries = [];
  const auth = await loadSiteModule('../apps/site/src/lib/auth-rate-limit.ts', {
    crypto, '@motivefx/database':{prisma:{opsAuditEvent:{count:async q => {queries.push(q);return count;},create:async q=>writes.push(q)}}},
  });
  const input = {scope:'login',identifier:'private@example.test:192.0.2.1',limit:3,windowMs:60_000};
  assert.equal(await auth.consumeAuthRateLimit(input), true);
  assert.match(writes[0].data.targetId, /^[a-f0-9]{40}$/);
  assert.equal(JSON.stringify(writes).includes(input.identifier), false);
  assert.equal(queries[0].where.action, 'auth.rate_limit.login');
  count=3; assert.equal(await auth.consumeAuthRateLimit(input), false); assert.equal(writes.length,1);
  assert.equal(auth.requestIp(new Request('https://qa.invalid',{headers:{'x-forwarded-for':'192.0.2.1, 192.0.2.2'}})), '192.0.2.1');
  assert.equal(auth.requestIp(new Request('https://qa.invalid')), 'unknown');
});

test('native handoff rejects external and backslash redirects while preserving internal paths', async () => {
  const route = await loadSiteModule('../apps/site/src/app/api/auth/native-handoff/route.ts', {
    'next/server':{}, jose, '@motivefx/database':{}, '@/lib/session':{}, '@/lib/one-time-auth':{},
  }, '\nexport { safeTerminalNext };');
  for (const path of ['https://evil.test','//evil.test','/\\evil.test','/path\u0000next']) assert.equal(route.safeTerminalNext(path), '/terminal');
  assert.equal(route.safeTerminalNext('/terminal/?page=stocks'), '/terminal?page=stocks');
  assert.equal(route.safeTerminalNext('/app/settings'), '/app/settings');
});

test('Apple subscription events preserve comps and Stripe accounts and reject stale expirations', async () => {
  let user, update; const invalidations=[];
  const tiers = await loadSiteModule('../apps/site/src/lib/tiers.ts');
  const apple = await loadSiteModule('../apps/site/src/lib/apple-iap.ts', {
    '@motivefx/database':{prisma:{user:{findUnique:async()=>user,update:async q=>{update=q.data;}}}},
    './load-user':{invalidateUserCache:id=>invalidations.push(id)}, './tiers':tiers,
  });
  for(const name of ['constructor','__proto__','toString','unknown']) assert.equal(apple.tierFromAppleProductId(name),null);
  assert.equal(apple.tierFromAppleProductId('Ultra.Plus'),'ultra_plus');
  user={subscriptionStatus:'comp'};
  await apple.activateAppleSubscription({userId:'user',originalTransactionId:'new',productId:'Elite'});
  await apple.deactivateAppleSubscription('user','new'); assert.equal(update,undefined);
  user={billingProvider:'stripe',subscriptionStatus:'active'};
  await apple.deactivateAppleSubscription('user','new'); assert.equal(update,undefined);
  user={billingProvider:'apple',subscriptionStatus:'active',appleOriginalTransactionId:'new',selectedMarkets:'["crypto","stocks"]'};
  await apple.deactivateAppleSubscription('user','old'); assert.equal(update,undefined);
  await apple.activateAppleSubscription({userId:'user',originalTransactionId:'new',productId:'Pro'});
  assert.equal(update.intelligenceTier,'pro'); assert.deepEqual(JSON.parse(update.selectedMarkets),['crypto','stocks']);
  assert.equal(update.stripeSubscriptionId,null); assert.equal(update.billingProvider,'apple');
  await apple.deactivateAppleSubscription('user','new'); assert.equal(update.subscriptionStatus,'cancelled');
  assert.equal(invalidations.length,2);
});

test('database URLs heal legacy pool limits and preserve explicit transport settings', async t => {
  const previous=process.env.PRISMA_CONNECTION_LIMIT; delete process.env.PRISMA_CONNECTION_LIMIT;
  t.after(()=>{if(previous===undefined)delete process.env.PRISMA_CONNECTION_LIMIT;else process.env.PRISMA_CONNECTION_LIMIT=previous;});
  const db=await loadSiteModule('../packages/database/src/index.ts', {'@prisma/client':{PrismaClient:class{}}}, '\nexport { serverlessDatabaseUrl };');
  const healed=new URL(db.serverlessDatabaseUrl('postgresql://qa:fake@qa.pooler.supabase.com:6543/db?connection_limit=1'));
  assert.equal(healed.searchParams.get('connection_limit'),'3'); assert.equal(healed.searchParams.get('pgbouncer'),'true');
  assert.equal(healed.searchParams.get('sslmode'),'require'); assert.equal(healed.searchParams.get('pool_timeout'),'15');
  const direct=new URL(db.serverlessDatabaseUrl('postgresql://qa:fake@db.qa.supabase.co:5432/db?pool_timeout=7&sslmode=verify-full'));
  assert.equal(direct.searchParams.get('connection_limit'),'1'); assert.equal(direct.searchParams.get('pool_timeout'),'7'); assert.equal(direct.searchParams.get('sslmode'),'verify-full');
  process.env.PRISMA_CONNECTION_LIMIT='5'; assert.equal(new URL(db.serverlessDatabaseUrl(healed.toString())).searchParams.get('connection_limit'),'5');
  process.env.PRISMA_CONNECTION_LIMIT='999'; assert.equal(new URL(db.serverlessDatabaseUrl(healed.toString())).searchParams.get('connection_limit'),'3');
  assert.equal(db.serverlessDatabaseUrl('malformed'),'malformed'); assert.equal(db.serverlessDatabaseUrl(undefined),undefined);
});

test('sportsbook identity isolates simulation, deduplicates trimmed picks and preserves listed books', async () => {
  let query, created=0, existing={id:'existing'};
  const bets=await loadSiteModule('../apps/site/src/lib/terminal/bets.ts', {'@motivefx/database':{prisma:{userBet:{
    findFirst:async q=>{query=q;return existing;}, create:async()=>{created++;return{id:'new'};},
    findMany:async()=>[{id:'bet',sportsbook:'FanDuel',isSimulation:false,createdAt:new Date(0),settledAt:null}],
  }}}});
  assert.equal(await bets.addBet('user',{matchup:' Match ',pick:' Pick ',sportsbook:' DraftKings ',isSimulation:true}),'existing');
  assert.deepEqual(plain(query.where),{userId:'user',matchup:{equals:'Match',mode:'insensitive'},pick:{equals:'Pick',mode:'insensitive'},sportsbook:{equals:'DraftKings',mode:'insensitive'},status:'open',isSimulation:true});
  assert.equal(created,0); existing=null;
  assert.equal(await bets.addBet('user',{matchup:'Match',pick:'Pick',sportsbook:' '}),'new');
  assert.equal(query.where.sportsbook,null); assert.equal(query.where.isSimulation,false);
  assert.equal((await bets.listBets('user'))[0].sportsbook,'FanDuel');
});
