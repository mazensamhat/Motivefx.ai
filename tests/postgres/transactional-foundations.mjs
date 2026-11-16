import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadSiteModule, siteRequire } from '../load-site-module.mjs';

// This suite resets schema. Refuse every target except the explicitly named,
// loopback-only disposable fixture database; no production credentials are used.
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MOTIVEFX_DISPOSABLE_DB !== '1' || url.protocol !== 'postgresql:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/motivefx_foundations_test' || process.env.DIRECT_URL !== process.env.DATABASE_URL) {
  throw Error('Refusing database acceptance outside the explicit local disposable fixture');
}
const dbRequire = createRequire(new URL('../../packages/database/package.json', import.meta.url));
const { PrismaClient } = dbRequire('@prisma/client');
const prisma = new PrismaClient();
const second = new PrismaClient();
const crypto = siteRequire('node:crypto');
const root = fileURLToPath(new URL('../../', import.meta.url));
const blockedFetch = async () => { throw Error('External network is forbidden in database acceptance'); };
const globals = { fetch: blockedFetch, Response, Headers, Buffer };
const load = (path, deps = {}) => loadSiteModule(`../apps/site/src/lib/${path}.ts`, deps, '', globals);
const tiers = await load('tiers');
const comp = await load('comp-access');
const subscription = await load('subscription-access', { './comp-access': comp });
const entitlements = await load('entitlements', { './tiers': tiers });
const plan = await load('terminal/plan', { '../tiers': tiers, '../entitlements': entitlements, '../subscription-access': subscription });
const policy = await load('notifications/policy', { 'node:crypto': crypto });
const store = await load('notifications/store', { '@motivefx/database': { prisma }, '../terminal/plan': plan, './policy': policy });
const onboarding = await load('notifications/onboarding', { 'node:crypto': crypto, '@motivefx/database': { prisma }, './policy': policy, './store': store, '../terminal/plan': plan });
const worker = await load('notifications/worker', { './policy': policy });
const svix = siteRequire('svix');
const receipts = await load('notifications/receipts', { svix });
const emailReceipts = await loadSiteModule('../apps/site/src/app/api/webhooks/notification-email/route.ts', {
  '@motivefx/database': { prisma }, '@/lib/notifications/store': store, '@/lib/notifications/receipts': receipts,
}, '', globals);
const webhookSecret = `whsec_${Buffer.from('isolated-fixture-signing-key-only').toString('base64')}`;
function emailReceiptRequest(key, id, eventType, providerId = 'synthetic-email') {
  const timestamp = new Date();
  const raw = JSON.stringify({ type: eventType, data: { email_id: providerId, tags: { motive_notification: key } } });
  return new Request('https://fixture.invalid/api/webhooks/notification-email', { method: 'POST', body: raw, headers: {
    'svix-id': id, 'svix-timestamp': String(Math.floor(+timestamp / 1000)), 'svix-signature': new svix.Webhook(webhookSecret).sign(id, timestamp, raw),
  } });
}
const billing = await load('stripe-reconciliation', { crypto, '@motivefx/database': { prisma }, './load-user': { invalidateUserCache() {} }, './tiers': tiers });
const password = await load('password-reset', { crypto, '@motivefx/database': { prisma } });
let syntheticSends = 0;
const setup = await load('checkout-account-setup', { crypto, '@motivefx/database': { prisma }, './password-reset': password, './account-setup-email': { sendAccountSetupEmail: async () => { syntheticSends++; throw Error('Synthetic ambiguous provider result'); } } });
const ops = await load('ops/durable', { 'node:crypto': crypto, '@motivefx/database': { prisma }, '@/lib/terminal/market-truth/signal-confluence': { classifyMotiveStance() { throw Error('Not part of incident acceptance'); } } });
const workspacePolicy = await load('terminal/institutional-policy', { zod: siteRequire('zod') });
const workspace = await load('terminal/institutional', { crypto, '@motivefx/database': { prisma }, './institutional-policy': workspacePolicy });
const newTables = ['NotificationConsent', 'NotificationDevice', 'NotificationDelivery', 'NotificationReceipt', 'EmailVerification', 'EmailVerificationChallenge'];
const now = new Date('2026-11-16T18:00:00Z');
let nextId = 0;
async function user(prefix, data = {}) {
  const id = `${prefix}-${++nextId}`;
  return prisma.user.create({ data: { id, email: `${id}@example.invalid`, intelligenceTier: 'ultra_plus', subscriptionStatus: 'comp', ...data } });
}
const content = { title: 'Fixture daily', body: 'Fixture research only', path: '/terminal' };
async function queue(u, eventKey, channel = 'daily_email', targetRef = policy.emailHash(u.email)) {
  return store.enqueueNotification({ userId: u.id, channel, targetRef, eventKey, content }, +now);
}
async function consent(u) {
  return prisma.notificationConsent.create({ data: { userId: u.id, dailyEmailConsentAt: new Date(+now - 1000), dailyEmailConfirmedAt: new Date(+now - 900), confirmedEmailHash: policy.emailHash(u.email), pushConsentAt: new Date(+now - 1000) } });
}
const migratedFiles = ['20261116011500_notification_delivery_foundations', '20261116020000_email_verification_foundations', '20261116181000_notification_fk_update_contract'];
async function statements(sql) {
  for (const part of sql.split(/;\s*(?:\n|$)/)) if (part.trim()) await prisma.$executeRawUnsafe(part);
}
before(async () => {
  const version = await prisma.$queryRaw`SELECT version() AS version`;
  console.log(`Actual database: ${version[0].version.split(' on ')[0]}`);
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  const ddl = execFileSync(process.execPath, [dbRequire.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'packages/database/prisma/schema.prisma', '--script'], { cwd: root, encoding: 'utf8', maxBuffer: 10_000_000 });
  await statements(ddl);
  // Apply the actual staged migrations to the baseline, rather than letting
  // Prisma db push mask a missing index, FK action or RLS instruction.
  await prisma.$executeRawUnsafe(`DROP TABLE ${newTables.map(x => `"${x}"`).join(', ')} CASCADE`);
  for (const file of migratedFiles) await statements(await readFile(new URL(`../../packages/database/prisma/migrations/${file}/migration.sql`, import.meta.url), 'utf8'));
  await prisma.$executeRawUnsafe('DROP ROLE IF EXISTS motivefx_fixture_client');
  await prisma.$executeRawUnsafe('CREATE ROLE motivefx_fixture_client NOLOGIN');
  await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO motivefx_fixture_client');
  await prisma.$executeRawUnsafe('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO motivefx_fixture_client');
  await prisma.$executeRawUnsafe('CREATE TABLE fixture_audit_failure (target_id TEXT PRIMARY KEY)');
  await prisma.$executeRawUnsafe(`CREATE FUNCTION fixture_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM fixture_audit_failure WHERE target_id=NEW."targetId") THEN RAISE EXCEPTION 'isolated audit failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER fixture_reject_audit BEFORE INSERT ON "OpsAuditEvent" FOR EACH ROW EXECUTE FUNCTION fixture_reject_audit()');
  await prisma.$executeRawUnsafe('CREATE TABLE fixture_consent_failure (user_id TEXT PRIMARY KEY)');
  await prisma.$executeRawUnsafe(`CREATE FUNCTION fixture_reject_consent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM fixture_consent_failure WHERE user_id=NEW."userId") THEN RAISE EXCEPTION 'isolated consent failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER fixture_reject_consent BEFORE INSERT OR UPDATE ON "NotificationConsent" FOR EACH ROW EXECUTE FUNCTION fixture_reject_consent()');
  process.env.MOTIVE_NOTIFICATION_WEBHOOK_SECRET = webhookSecret;
  process.env.MOTIVE_NOTIFICATION_STORAGE_ENABLED = 'true';
  process.env.MOTIVE_NOTIFICATION_SEND_ENABLED = 'true';
  process.env.MOTIVE_EMAIL_VERIFICATION_ENABLED = 'true';
  process.env.MOTIVE_PUSH_REGISTRATION_ENABLED = 'true';
}, { timeout: 60_000 });
after(async () => { await Promise.all([prisma.$disconnect(), second.$disconnect()]); });

test('actual additive migrations enable RLS with no client policies; granted client roles cannot read or insert', async () => {
  const u = await user('rls'); await consent(u); const key = await queue(u, 'rls');
  await prisma.notificationDevice.create({ data: { userId: u.id, token: 'ExpoPushToken[rlsfixture123]', platform: 'android', consentAt: now } });
  await prisma.notificationReceipt.create({ data: { id: 'rls', provider: 'fixture', eventType: 'fixture', providerId: 'synthetic' } });
  await prisma.emailVerification.create({ data: { userId: u.id, emailHash: policy.emailHash(u.email), verifiedAt: now } });
  await prisma.emailVerificationChallenge.create({ data: { tokenHash: 'rls', userId: u.id, emailHash: policy.emailHash(u.email), purpose: 'account', expiresAt: new Date(+now + 1000) } });
  const tables = await prisma.$queryRawUnsafe(`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN (${newTables.map(x => `'${x}'`).join(',')})`);
  assert.equal(tables.length, 6); assert.ok(tables.every(t => t.relrowsecurity));
  const policies = await prisma.$queryRawUnsafe(`SELECT tablename FROM pg_policies WHERE tablename IN (${newTables.map(x => `'${x}'`).join(',')})`); assert.equal(policies.length, 0);
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE motivefx_fixture_client');
    for (const table of newTables) assert.equal((await tx.$queryRawUnsafe(`SELECT count(*)::integer AS n FROM "${table}"`))[0].n, 0, table);
  });
  await assert.rejects(prisma.$transaction(async tx => { await tx.$executeRawUnsafe('SET LOCAL ROLE motivefx_fixture_client'); await tx.$executeRawUnsafe(`INSERT INTO "NotificationReceipt" ("id","provider","eventType","providerId") VALUES ('denied','fixture','fixture','fixture')`); }), /row-level security/);
  assert.ok(await prisma.notificationDelivery.findUnique({ where: { key } }));
});

test('migration foreign keys match generated Prisma cascade semantics', async () => {
  const keys = await prisma.$queryRawUnsafe(`SELECT c.conrelid::regclass::text AS table_name, c.confupdtype, c.confdeltype FROM pg_constraint c WHERE c.contype='f' AND c.conrelid IN (${newTables.filter(x => x !== 'NotificationReceipt').map(x => `'"${x}"'::regclass`).join(',')})`);
  assert.equal(keys.length, 5);
  for (const key of keys) { assert.equal(key.confdeltype, 'c', `${key.table_name} delete`); assert.equal(key.confupdtype, 'c', `${key.table_name} update`); }
});

test('duplicate enqueue preserves the immutable payload and concurrent claims have one winner', async () => {
  const u = await user('claim'); const key = await queue(u, 'stable-event');
  await Promise.all(Array.from({ length: 6 }, () => store.enqueueNotification({ userId: u.id, channel: 'daily_email', eventKey: 'stable-event', targetRef: policy.emailHash(u.email), content: { ...content, body: 'Must not replace original payload' } }, +now)));
  assert.equal(JSON.parse((await prisma.notificationDelivery.findUnique({ where: { key } })).contentJson).body, content.body);
  const claims = await Promise.all(Array.from({ length: 6 }, () => store.notificationStore.claim(key, +now)));
  assert.equal(claims.filter(Boolean).length, 1); assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).attempts, 1);
  await assert.rejects(store.notificationStore.finish(key, 99, { state: 'accepted' }), /claim_lost/);
  await store.notificationStore.finish(key, 1, { state: 'accepted', providerId: 'synthetic-provider-id' });
  assert.equal(await store.notificationStore.claim(key, +now), null);
});

test('first enqueue racing on a missing key remains idempotent', async () => {
  const u = await user('first-enqueue'); const keys = await Promise.all(Array.from({ length: 8 }, () => queue(u, 'new-event')));
  assert.equal(new Set(keys).size, 1); assert.equal(await prisma.notificationDelivery.count({ where: { userId: u.id } }), 1);
});

test('consent revocation and entitlement loss suppress pending dispatch without a provider call', async () => {
  const u = await user('revoke'); await consent(u); const key = await queue(u, 'revoke');
  await onboarding.revokeNotificationChannel(u.id, 'daily_email', new Date(+now + 100));
  let sends = 0;
  const dependencies = { enabled: true, now: () => +now + 200, store: store.notificationStore, send: async () => { sends++; return { kind: 'accepted', providerId: 'synthetic' }; } };
  assert.equal((await worker.runDelivery(key, dependencies)).state, 'not_claimed'); assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).state, 'suppressed');
  const downgraded = await user('downgraded'); await consent(downgraded); const pending = await queue(downgraded, 'downgraded');
  await prisma.user.update({ where: { id: downgraded.id }, data: { subscriptionStatus: 'none' } });
  assert.equal((await worker.runDelivery(pending, dependencies)).state, 'suppressed'); assert.equal(sends, 0);
});

test('disabled delivery and onboarding gates remain inactive with actual storage available', async () => {
  const u = await user('inactive'); const key = await queue(u, 'inactive'); process.env.MOTIVE_NOTIFICATION_SEND_ENABLED = 'false';
  try {
    assert.equal((await onboarding.prepareEmailVerification(u.id, 'account', now)).state, 'inactive');
    assert.equal((await worker.runDelivery(key, { enabled: false, now: () => +now, store: store.notificationStore, send: blockedFetch })).state, 'disabled');
    assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).attempts, 0);
  } finally { process.env.MOTIVE_NOTIFICATION_SEND_ENABLED = 'true'; }
});

test('abandoned claims are quarantined, never returned to the send queue', async () => {
  const u = await user('abandoned'); const key = await queue(u, 'abandoned'); await store.notificationStore.claim(key, +now);
  await store.quarantineAbandonedNotifications(+now + 11 * 60_000);
  assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).state, 'unknown'); assert.equal(await store.notificationStore.claim(key, +now + 12 * 60_000), null);
});

test('signed duplicate email receipts commit once and late delivery cannot undo suppression', async () => {
  const u = await user('email-receipts'); await consent(u); const key = await queue(u, 'email-receipts');
  await store.notificationStore.claim(key, +now); await store.notificationStore.finish(key, 1, { state: 'accepted', providerId: 'synthetic-email' });
  const waiting = await queue(u, 'waiting-email');
  const responses = await Promise.all(Array.from({ length: 5 }, () => emailReceipts.POST(emailReceiptRequest(key, 'receipt-bounce', 'email.bounced'))));
  assert.ok(responses.every(x => x.status === 200)); assert.equal(await prisma.notificationReceipt.count({ where: { id: 'resend:receipt-bounce' } }), 1);
  assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).state, 'suppressed');
  assert.equal((await prisma.notificationDelivery.findUnique({ where: { key: waiting } })).state, 'suppressed');
  assert.ok((await prisma.notificationConsent.findUnique({ where: { userId: u.id } })).emailSuppressedAt);
  assert.equal((await emailReceipts.POST(emailReceiptRequest(key, 'receipt-late', 'email.delivered'))).status, 200);
  assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).state, 'suppressed');
  assert.equal((await emailReceipts.POST(emailReceiptRequest(key, 'receipt-unmatched', 'email.delivered', 'foreign-provider-id'))).status, 503);
  assert.equal(await prisma.notificationReceipt.count({ where: { id: 'resend:receipt-unmatched' } }), 0);
});

test('a failed email suppression transaction rolls back receipt and job state, then retries cleanly', async () => {
  const u = await user('receipt-rollback'); await consent(u); const key = await queue(u, 'receipt-rollback');
  await store.notificationStore.claim(key, +now); await store.notificationStore.finish(key, 1, { state: 'accepted', providerId: 'synthetic-email' });
  await prisma.$executeRaw`INSERT INTO fixture_consent_failure (user_id) VALUES (${u.id})`;
  assert.equal((await emailReceipts.POST(emailReceiptRequest(key, 'receipt-rollback', 'email.complained'))).status, 503);
  assert.equal(await prisma.notificationReceipt.count({ where: { id: 'resend:receipt-rollback' } }), 0);
  assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).state, 'accepted');
  await prisma.$executeRaw`DELETE FROM fixture_consent_failure WHERE user_id=${u.id}`;
  assert.equal((await emailReceipts.POST(emailReceiptRequest(key, 'receipt-rollback', 'email.complained'))).status, 200);
  assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).state, 'suppressed');
});

test('synthetic Expo receipt revokes the actual stored device and suppresses its pending jobs', async () => {
  const u = await user('expo-receipt'); await consent(u);
  const device = await onboarding.registerPushDevice(u.id, { token: 'ExpoPushToken[receiptfixture123]', platform: 'android', permission: 'granted' }, now);
  const key = await queue(u, 'expo-accepted', 'expo_push', device.deviceId); const queued = await queue(u, 'expo-queued', 'expo_push', device.deviceId);
  await store.notificationStore.claim(key, +now); await store.notificationStore.finish(key, 1, { state: 'accepted', providerId: 'synthetic-ticket' });
  let calls = 0;
  const push = await loadSiteModule('../apps/site/src/lib/notifications/push-receipts.ts', {
    '@motivefx/database': { prisma }, './store': store, './receipts': receipts,
  }, '', { ...globals, AbortSignal, fetch: async (url, init) => {
    calls++; assert.equal(url, 'https://exp.host/--/api/v2/push/getReceipts'); assert.deepEqual(JSON.parse(init.body).ids, ['synthetic-ticket']);
    return Response.json({ data: { 'synthetic-ticket': { status: 'error', details: { error: 'DeviceNotRegistered' } } } });
  } });
  assert.equal((await push.pollPushReceipts(+now + 16 * 60_000)).checked, 1); assert.equal(calls, 1);
  assert.ok((await prisma.notificationDevice.findUnique({ where: { id: device.deviceId } })).revokedAt);
  for (const deliveryKey of [key, queued]) assert.equal((await prisma.notificationDelivery.findUnique({ where: { key: deliveryKey } })).state, 'suppressed');
});

test('verification request cooldown and single-use consumption serialize across actual connections', async () => {
  const u = await user('verification');
  const requests = await Promise.all(Array.from({ length: 5 }, () => onboarding.prepareEmailVerification(u.id, 'account', now)));
  assert.equal(requests.filter(x => x.state === 'prepared').length, 1); assert.equal(requests.filter(x => x.state === 'rate_limited').length, 4);
  const prepared = requests.find(x => x.state === 'prepared');
  const confirmations = await Promise.all(Array.from({ length: 5 }, () => onboarding.confirmEmailVerification(prepared.token, new Date(+now + 100))));
  assert.equal(confirmations.filter(x => x.state === 'verified').length, 1); assert.equal(confirmations.filter(x => x.state === 'invalid').length, 4);
  assert.equal(await prisma.emailVerification.count({ where: { userId: u.id } }), 1); assert.equal(await prisma.notificationConsent.count({ where: { userId: u.id } }), 0);
});

test('resend invalidates old tokens and opt-out cannot be reversed by an older Daily confirmation', async () => {
  const u = await user('resend'); const first = await onboarding.prepareEmailVerification(u.id, 'account', now);
  const next = await onboarding.prepareEmailVerification(u.id, 'account', new Date(+now + 61_000));
  assert.equal((await onboarding.confirmEmailVerification(first.token, new Date(+now + 62_000))).state, 'invalid');
  assert.equal((await onboarding.confirmEmailVerification(next.token, new Date(+now + 62_000))).state, 'verified');
  const daily = await onboarding.prepareEmailVerification(u.id, 'daily_email', new Date(+now + 63_000));
  await onboarding.revokeNotificationChannel(u.id, 'daily_email', new Date(+now + 64_000));
  assert.equal((await onboarding.confirmEmailVerification(daily.token, new Date(+now + 65_000))).state, 'verified_without_subscription');
  assert.equal((await prisma.notificationConsent.findUnique({ where: { userId: u.id } })).dailyEmailConfirmedAt, null);
});

test('device registration serializes same-owner retries and refuses cross-account token transfer', async () => {
  const u = await user('device'), other = await user('other-device'); const input = { token: 'ExpoPushToken[sharedfixture123]', platform: 'android', permission: 'granted' };
  const results = await Promise.all(Array.from({ length: 5 }, () => onboarding.registerPushDevice(u.id, input, now)));
  assert.ok(results.every(x => x.state === 'registered')); assert.equal(new Set(results.map(x => x.deviceId)).size, 1);
  assert.equal((await onboarding.registerPushDevice(other.id, input, now)).state, 'ownership_conflict');
  const key = await queue(u, 'push-revoke', 'expo_push', results[0].deviceId); await onboarding.revokeNotificationChannel(u.id, 'expo_push', new Date(+now + 100));
  assert.ok((await prisma.notificationDevice.findUnique({ where: { id: results[0].deviceId } })).revokedAt); assert.equal((await prisma.notificationDelivery.findUnique({ where: { key } })).state, 'suppressed');
});

test('two accounts racing to register the same new token get one owner and an honest conflict', async () => {
  const a = await user('race-device-a'), b = await user('race-device-b'); const input = { token: 'ExpoPushToken[racedevice123]', platform: 'android', permission: 'granted' };
  const results = await Promise.all([onboarding.registerPushDevice(a.id, input, now), onboarding.registerPushDevice(b.id, input, now)]);
  assert.deepEqual(results.map(x => x.state).sort(), ['ownership_conflict', 'registered']);
  assert.equal(await prisma.notificationDevice.count({ where: { token: input.token } }), 1);
});

test('account deletion cascades personal notification and verification state', async () => {
  const u = await user('delete'); await consent(u); await queue(u, 'delete');
  await onboarding.registerPushDevice(u.id, { token: 'ExpoPushToken[deletefixture123]', platform: 'android', permission: 'granted' }, now);
  const verification = await onboarding.prepareEmailVerification(u.id, 'account', now); await onboarding.confirmEmailVerification(verification.token, new Date(+now + 100));
  await prisma.user.delete({ where: { id: u.id } });
  for (const model of ['notificationConsent', 'notificationDevice', 'notificationDelivery', 'emailVerification', 'emailVerificationChallenge']) assert.equal(await prisma[model].count({ where: { userId: u.id } }), 0, model);
});

function stripeFixture(u, suffix, created = 100) {
  const sub = { id: `sub_${suffix}`, customer: u.stripeCustomerId, created, status: 'active', latest_invoice: `in_${suffix}`, metadata: { userId: u.id, tier: 'pro', selectedMarkets: '["stocks","crypto"]' } };
  const subs = new Map([[sub.id, sub]]);
  return { sub, subs, provider: { subscriptions: { retrieve: async id => { if (!subs.has(id)) throw Error('Unknown fixture subscription'); return structuredClone(subs.get(id)); } }, invoices: { retrieve: async () => ({ status: 'paid' }) } } };
}
test('concurrent duplicate Stripe events commit one durable receipt and one entitlement transition', async () => {
  const u = await user('billing', { intelligenceTier: 'lite', subscriptionStatus: 'none', stripeCustomerId: 'cus_fixture' }); const f = stripeFixture(u, 'fixture');
  const results = await Promise.all(Array.from({ length: 5 }, () => billing.reconcileStripeSubscription(f.provider, f.sub.id, 'evt_fixture')));
  assert.equal(results.filter(x => x.changed).length, 1); assert.equal(results.filter(x => x.duplicate).length, 4);
  assert.equal(await prisma.opsAuditEvent.count({ where: { id: billing.stripeReceiptId('evt_fixture') } }), 1);
  const updated = await prisma.user.findUnique({ where: { id: u.id } }); assert.equal(updated.intelligenceTier, 'pro'); assert.equal(updated.stripeSubscriptionId, f.sub.id);
});

test('failed Stripe audit rolls back entitlement and permits a later retry', async () => {
  const u = await user('reject-audit-billing', { intelligenceTier: 'lite', subscriptionStatus: 'none', stripeCustomerId: 'cus_rejected' }); const f = stripeFixture(u, 'rejected');
  await prisma.$executeRaw`INSERT INTO fixture_audit_failure (target_id) VALUES (${u.id})`;
  await assert.rejects(billing.reconcileStripeSubscription(f.provider, f.sub.id, 'evt_rejected'), /isolated audit failure/);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).subscriptionStatus, 'none'); assert.equal(await prisma.opsAuditEvent.count({ where: { id: billing.stripeReceiptId('evt_rejected') } }), 0);
  await prisma.$executeRaw`DELETE FROM fixture_audit_failure WHERE target_id=${u.id}`;
  assert.equal((await billing.reconcileStripeSubscription(f.provider, f.sub.id, 'evt_rejected')).changed, true);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).subscriptionStatus, 'active');
});

test('old subscription cannot resurrect access after a newer subscription is canceled', async () => {
  const u = await user('billing-order', { intelligenceTier: 'lite', subscriptionStatus: 'none', stripeCustomerId: 'cus_order' }); const f = stripeFixture(u, 'newer', 200);
  await billing.reconcileStripeSubscription(f.provider, f.sub.id, 'evt_newer'); f.sub.status = 'canceled'; await billing.reconcileStripeSubscription(f.provider, f.sub.id, 'evt_canceled');
  const old = { ...f.sub, id: 'sub_older', created: 100, status: 'active' }; f.subs.set(old.id, old); await billing.reconcileStripeSubscription(f.provider, old.id, 'evt_older');
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).subscriptionStatus, 'none'); assert.equal((await prisma.opsAuditEvent.findUnique({ where: { id: billing.stripeReceiptId('evt_older') } })).reason, 'older_subscription_ignored');
});

test('checkout setup claims once and preserves ambiguous delivery without another token/send', async () => {
  const u = await user('setup'); syntheticSends = 0;
  await Promise.all(Array.from({ length: 5 }, () => setup.sendCheckoutAccountSetup(u.id, 'cs_fixture'))); await setup.sendCheckoutAccountSetup(u.id, 'cs_fixture');
  assert.equal(syntheticSends, 1); assert.equal(await prisma.passwordResetToken.count({ where: { userId: u.id } }), 1);
  const rows = await prisma.opsAuditEvent.findMany({ where: { targetId: u.id, action: 'auth.account_setup.delivery' } }); assert.equal(rows.length, 1); assert.equal(rows[0].result, 'delivery_unknown');
});

const incident = id => ({ id, severity: 'HIGH', domain: 'fixture', title: 'Fixture incident', description: 'Synthetic condition', source: 'fixture' });
const statusInput = (id, status) => ({ id, status, actorId: 'fixture-operator', actorEmail: 'operator@example.invalid' });
test('Ops status and audit commit together; concurrent operators see the actual prior status', async () => {
  await ops.upsertIncident(incident('incident-ok'));
  await Promise.all([ops.updateIncidentStatus(statusInput('incident-ok', 'acknowledged')), ops.updateIncidentStatus(statusInput('incident-ok', 'investigating'))]);
  const rows = await prisma.opsAuditEvent.findMany({ where: { targetId: 'incident-ok', action: 'ops.incident.acknowledge' } }); assert.equal(rows.length, 2);
  const first = rows.find(x => JSON.parse(x.beforeJson).status === 'open'); assert.ok(first); const last = rows.find(x => x.id !== first.id);
  assert.equal(JSON.parse(last.beforeJson).status, JSON.parse(first.afterJson).status); assert.equal((await prisma.opsIncidentRecord.findUnique({ where: { id: 'incident-ok' } })).status, JSON.parse(last.afterJson).status);
  await ops.updateIncidentStatus(statusInput('incident-ok', 'resolved')); await ops.upsertIncident(incident('incident-ok'));
  const reopened = await prisma.opsIncidentRecord.findUnique({ where: { id: 'incident-ok' } }); assert.equal(reopened.status, 'open'); assert.equal(reopened.resolvedAt, null); assert.equal(reopened.acknowledgedBy, null);
});

test('an actual database audit rejection rolls back Ops status; missing incidents create no audit', async () => {
  await ops.upsertIncident(incident('reject-audit-incident'));
  await prisma.$executeRaw`INSERT INTO fixture_audit_failure (target_id) VALUES ('reject-audit-incident')`;
  await assert.rejects(ops.updateIncidentStatus(statusInput('reject-audit-incident', 'resolved')), /isolated audit failure/);
  assert.equal((await prisma.opsIncidentRecord.findUnique({ where: { id: 'reject-audit-incident' } })).status, 'open'); assert.equal(await prisma.opsAuditEvent.count({ where: { targetId: 'reject-audit-incident' } }), 0);
  assert.equal(await ops.updateIncidentStatus(statusInput('missing-incident', 'resolved')), false);
});

test('workspace creation is idempotent and denied roles leave the actual database unchanged', async () => {
  const owner = await user('workspace-owner'); const created = await Promise.all([workspace.ensureTeamForOwner(owner), workspace.ensureTeamForOwner(owner)]); assert.equal(created[0].id, created[1].id);
  const viewer = await user('workspace-viewer'); await prisma.teamMember.create({ data: { teamId: created[0].id, userId: viewer.id, role: 'viewer', status: 'active' } });
  for (const capability of ['invite', 'preferences', 'research']) await assert.rejects(workspace.withWorkspaceAccess(viewer.id, capability, tx => tx.teamNote.create({ data: { teamId: created[0].id, authorId: viewer.id, title: 'Denied', body: 'Denied' } })), /permission/);
  assert.equal(await prisma.teamNote.count({ where: { teamId: created[0].id } }), 0);
});

test('locked workspace authorization observes a concurrent downgrade before any research write', async () => {
  const owner = await user('race-owner'), admin = await user('race-admin'); const team = await workspace.ensureTeamForOwner(owner); const member = await prisma.teamMember.create({ data: { teamId: team.id, userId: admin.id, role: 'admin', status: 'active' } });
  let release, locked; const held = new Promise(resolve => { locked = resolve; }); const proceed = new Promise(resolve => { release = resolve; });
  const downgrade = second.$transaction(async tx => { await tx.teamMember.update({ where: { id: member.id }, data: { role: 'viewer' } }); locked(); await proceed; }, { timeout: 10_000 });
  await held;
  const write = workspace.withWorkspaceAccess(admin.id, 'research', tx => tx.teamNote.create({ data: { teamId: team.id, authorId: admin.id, title: 'Denied race', body: 'Must not persist' } }));
  const result = assert.rejects(write, /permission/);
  try {
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      const rows = await prisma.$queryRaw`SELECT query FROM pg_stat_activity WHERE datname = 'motivefx_foundations_test' AND wait_event_type = 'Lock'`;
      if (rows.some(r => r.query.includes('TeamMember') && r.query.includes('FOR UPDATE'))) { waiting = true; break; }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(waiting, true, 'Authorization must reach the actual locked membership read');
  } finally { release(); await downgrade; }
  await result; assert.equal(await prisma.teamNote.count({ where: { teamId: team.id } }), 0);
});
