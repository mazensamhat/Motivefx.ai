import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';
const policy = await loadSiteModule('../apps/site/src/lib/terminal/institutional-policy.ts', { zod: siteRequire('zod') });
const webRequire = createRequire(new URL('../web/package.json', import.meta.url));

async function harness(role = 'owner', options = {}) {
  const actor = { id: role === 'owner' ? 'owner-a' : 'member-a', email: 'actor@example.invalid', displayName: 'Fixture' };
  const teams = [
    { id: 'team-a', ownerId: 'owner-a', name: 'Own team', prefsJson: '{"scenarioTemplates":[],"customPriors":[]}' },
    { id: 'team-b', ownerId: 'owner-b', name: 'Foreign team', prefsJson: '{}' },
  ];
  let members = options.noTeam ? [] : [{ id: 'member', teamId: 'team-a', userId: actor.id, role, status: 'active', invitedEmail: actor.email }];
  if (options.noTeam) actor.id = 'new-user';
  const notes = [{ id: 'note-a', teamId: 'team-a', title: 'Own note', body: 'Own research', author: actor }, { id: 'note-b', teamId: 'team-b', title: 'Foreign note', body: 'Do not disclose', author: actor }];
  const writes = [], mails = [], locks = [];
  let failRead = false, commitBarrier = null, onLock = null, signedIn = true, entitled = true, impersonating = false;
  const selectMembers = where => members.filter(m => Object.entries(where).every(([k,v]) => m[k] === v));
  const tx = {
    $queryRaw: async (strings, ...values) => { const sql = strings.join('?'); locks.push({ sql, values }); if (onLock && sql.includes('"TeamMember"')) onLock(); return [{ id: values[0] }]; },
    user: { findUnique: async () => null },
    team: {
      findFirst: async ({ where }) => { if (failRead) throw Error('database unavailable'); return teams.find(t => t.ownerId === where.ownerId) ?? null; },
      create: async ({ data }) => { writes.push({ table: 'team', data }); const row = { id: 'new-team', ...data }; teams.push(row); return row; },
      update: async ({ where, data }) => { writes.push({ table: 'team', where, data }); Object.assign(teams.find(t => t.id === where.id), data); return teams.find(t => t.id === where.id); },
    },
    teamMember: {
      findFirst: async ({ where, include }) => { if (failRead) throw Error('database unavailable'); const m = selectMembers(where)[0]; return m ? { ...m, ...(include?.team ? { team: teams.find(t => t.id === m.teamId) } : {}) } : null; },
      findMany: async ({ where }) => selectMembers(where).map(m => ({ ...m, user: actor })),
      create: async ({ data }) => { writes.push({ table: 'member', data }); const row = { id: 'invited', ...data }; members.push(row); return row; },
      update: async ({ where, data }) => { writes.push({ table: 'member', where, data }); const row = members.find(m => m.id === where.id); Object.assign(row, data); return row; },
    },
    teamNote: {
      findMany: async ({ where }) => notes.filter(n => n.teamId === where.teamId),
      create: async ({ data }) => { writes.push({ table: 'note', data }); return { id: 'new-note', ...data }; },
    },
    apiKey: { count: async () => 0 },
  };
  const prisma = { ...tx, $transaction: async fn => { const result = await fn(tx); if (commitBarrier) await commitBarrier; return result; } };
  const institutional = await loadSiteModule('../apps/site/src/lib/terminal/institutional.ts', { crypto: siteRequire('crypto'), '@motivefx/database': { prisma }, './institutional-policy': policy });
  class FeatureLockedError extends Error {}
  const response = (body, status = 200, init) => Response.json(body, { status, ...init });
  const route = await loadSiteModule('../apps/site/src/app/api/institutional/workspace/route.ts', {
    '@/lib/api': { json: response, badRequest: error => response({ error }, 400), forbidden: error => response({ error }, 403), serverError: error => response({ error }, 500) },
    '@/lib/terminal/auth': { requireTerminalSession: async () => signedIn ? { ok: true, session: { user: actor, impersonating } } : { ok: false, response: response({}, 401) }, FeatureLockedError, accessErrorResponse: () => response({}, 403) },
    '@/lib/terminal/ios-reader': { entitlementsPlanForUser: async () => ({ tier: 'ultra_plus' }) },
    '@/lib/terminal/access': { requireFeature: () => { if (!entitled) throw new FeatureLockedError(); } },
    '@/lib/email': { sendTeamInviteEmail: async data => { mails.push(data); return { ok: true }; } },
    '@/lib/terminal/institutional-policy': policy,
    '@/lib/terminal/institutional': institutional,
  });
  return { route, institutional, actor, members, writes, mails, locks, failRead: () => { failRead = true; }, setCommitBarrier: value => { commitBarrier = value; }, setOnLock: fn => { onLock = fn; }, signOut: () => { signedIn = false; }, removeEntitlement: () => { entitled = false; }, impersonate: () => { impersonating = true; } };
}
const request = (body, origin) => new Request('https://fixture.invalid/api/institutional/workspace', { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const invite = role => ({ action: 'invite', email: 'invitee@example.invalid', role });
const note = { action: 'add_note', title: 'Thesis', noteBody: 'Research body' };
const template = { action: 'save_template', template: { label: 'Scenario', seedEvent: 'Demand changes' } };
const preferences = { action: 'save_prefs', prefs: { scenarioTemplates: [], customPriors: [] } };

for (const role of ['owner', 'admin', 'analyst', 'viewer']) test(`${role} receives the enforced server capability set and only its team data`, async () => {
  const h = await harness(role); const res = await h.route.GET(); assert.equal(res.status, 200);
  const body = await res.json(); assert.equal(body.dashboard.role, role); assert.deepEqual(body.dashboard.permissions, { ...policy.workspacePermissions(role) });
  assert.equal(body.dashboard.team.id, 'team-a'); assert.deepEqual(body.dashboard.notes.map(n => n.id), ['note-a']); assert.equal(h.writes.length, 0);
  assert.match(res.headers.get('cache-control'), /private, no-store/);
});
for (const role of ['owner', 'admin', 'analyst']) test(`${role} can save research with server-owned team and author identity`, async () => {
  const h = await harness(role); assert.equal((await h.route.POST(request(note))).status, 200); assert.equal((await h.route.POST(request(template))).status, 200);
  assert.equal(h.writes[0].data.teamId, 'team-a'); assert.equal(h.writes[0].data.authorId, h.actor.id); assert.equal(h.writes[1].where.id, 'team-a');
  assert.ok(h.locks.some(x => x.sql.includes('"TeamMember"') && x.sql.includes('FOR UPDATE'))); assert.equal(h.mails.length, 0);
});
for (const body of [invite('analyst'), note, template, preferences, { action: 'create_team' }]) test(`viewer cannot perform ${body.action} or produce a write/send`, async () => {
  const h = await harness('viewer'); assert.equal((await h.route.POST(request(body))).status, 403); assert.equal(h.writes.length, 0); assert.equal(h.mails.length, 0);
});
for (const body of [invite('viewer'), preferences]) test(`analyst cannot perform ${body.action}`, async () => {
  const h = await harness('analyst'); assert.equal((await h.route.POST(request(body))).status, 403); assert.equal(h.writes.length, 0); assert.equal(h.mails.length, 0);
});
test('owner may invite admins; admins may invite analysts but cannot grant peer admin roles', async () => {
  const owner = await harness('owner'); assert.equal((await owner.route.POST(request(invite('admin')))).status, 200); assert.equal(owner.writes[0].data.role, 'admin'); assert.equal(owner.mails.length, 1);
  const admin = await harness('admin'); assert.equal((await admin.route.POST(request(invite('admin')))).status, 403); assert.equal(admin.writes.length, 0); assert.equal(admin.mails.length, 0);
  assert.equal((await admin.route.POST(request(invite('analyst')))).status, 200); assert.equal(admin.writes[0].data.teamId, 'team-a'); assert.equal(admin.mails.length, 1);
});
test('invitation send waits for successful database commit', async () => {
  const h = await harness('owner'); let release; h.setCommitBarrier(new Promise(resolve => { release = resolve; }));
  const pending = h.route.POST(request(invite('analyst'))); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(h.writes.length, 1); assert.equal(h.mails.length, 0);
  release(); assert.equal((await pending).status, 200); assert.equal(h.mails.length, 1);
});
test('a failed commit never sends an invitation', async () => {
  const h = await harness('owner'); const rejected = Promise.reject(Error('commit failed')); rejected.catch(() => {}); h.setCommitBarrier(rejected);
  assert.equal((await h.route.POST(request(invite('analyst')))).status, 500); assert.equal(h.mails.length, 0);
});
for (const role of ['owner', 'superadmin', '__proto__']) test(`a non-owner membership label ${role} cannot grant ownership or read access`, async () => {
  const h = await harness('viewer'); h.members[0].role = role;
  assert.equal((await h.route.POST(request(invite('admin')))).status, 403); assert.equal((await h.route.GET()).status, 403); assert.equal(h.writes.length, 0); assert.equal(h.mails.length, 0);
});
test('membership revoked after candidate lookup is rechecked before a write', async () => {
  const h = await harness('admin'); h.setOnLock(() => { h.members[0].status = 'revoked'; });
  assert.equal((await h.route.POST(request(invite('analyst')))).status, 403); assert.equal(h.writes.length, 0); assert.equal(h.mails.length, 0);
});
test('no workspace is created implicitly by a denied action or a failed read', async () => {
  const h = await harness('viewer', { noTeam: true }); assert.equal((await h.route.POST(request(note))).status, 403); assert.equal(h.writes.length, 0);
  h.failRead(); assert.equal((await h.route.POST(request({ action: 'create_team' }))).status, 500); assert.equal(h.writes.length, 0);
});
test('explicit creation derives owner identity from the session', async () => {
  const h = await harness('viewer', { noTeam: true }); assert.equal((await h.route.POST(request({ action: 'create_team', name: 'New workspace' }))).status, 200);
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].data.ownerId, h.actor.id); assert.equal(h.writes[0].data.members.create.role, 'owner');
});
test('malformed fields, forged identities, owner grants and unsupported actions fail before writes', async () => {
  const h = await harness('owner');
  for (const body of ['{broken', null, [], {}, { action: 'create_team', name: 3 }, { ...invite('analyst'), teamId: 'team-b' }, invite('owner'), invite('__proto__'), { ...note, authorId: 'owner-b' }, { ...note, noteBody: [] }, { ...note, title: 'x'.repeat(161) }, { ...template, template: { label: 'X', seedEvent: 'Y', teamId: 'team-b' } }, { ...preferences, prefs: { scenarioTemplates: [], customPriors: [{ themeId: 'x', probabilityBias: 'high' }] } }, { action: 'delete_team' }]) {
    assert.equal((await h.route.POST(request(body))).status, 400, JSON.stringify(body));
  }
  assert.equal(h.writes.length, 0); assert.equal(h.mails.length, 0);
});
test('cross-origin, impersonation, authentication and entitlement denials never mutate the workspace', async () => {
  const h = await harness('owner'); assert.equal((await h.route.POST(request(note, 'https://other.invalid'))).status, 403);
  h.impersonate(); assert.equal((await h.route.POST(request(note))).status, 403);
  h.signOut(); assert.equal((await h.route.POST(request(note))).status, 401);
  const locked = await harness('owner'); locked.removeEntitlement(); assert.equal((await locked.route.POST(request(note))).status, 403);
  assert.equal(h.writes.length + locked.writes.length, 0); assert.equal(h.mails.length + locked.mails.length, 0);
});

async function renderWorkspace(role, { error = null, loading = false, noTeam = false, unavailable = false } = {}) {
  const React = webRequire('react');
  const dash = unavailable ? null : { team: noTeam ? null : { id: 'a', name: 'Own team', ownerId: 'owner' }, role, permissions: policy.workspacePermissions(role), members: [], notes: [], prefs: { scenarioTemplates: [] }, apiKeyCount: 0 };
  const states = [dash, error, false, '', '', '', '', '', loading];
  const component = await loadSiteModule('../web/src/components/InstitutionalPanel.tsx', {
    react: { ...React, useState: () => [states.shift(), () => {}], useEffect: () => {}, useCallback: fn => fn },
    'react/jsx-runtime': webRequire('react/jsx-runtime'), 'lucide-react': webRequire('lucide-react'), '../lib/api': {}, '../hooks/useModules': {}, '../lib/nativeShell': {},
  }, '\nexports.WorkspaceFixture = TeamWorkspaceSection;');
  return webRequire('react-dom/server').renderToStaticMarkup(React.createElement(component.WorkspaceFixture));
}
function buttonDisabled(html, label) {
  const button = [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].find(m => m[2].replace(/<[^>]+>/g, '').trim() === label);
  assert.ok(button, `Missing button ${label}`); return /\bdisabled/.test(button[1]);
}
for (const role of ['owner', 'admin', 'analyst', 'viewer']) test(`actual workspace component matches ${role} server permissions`, async () => {
  const html = await renderWorkspace(role); const p = policy.workspacePermissions(role);
  assert.equal(buttonDisabled(html, 'Invite'), !p.invite); assert.equal(buttonDisabled(html, 'Add shared note'), !p.research); assert.equal(buttonDisabled(html, 'Save template'), !p.research);
});
test('loading and unavailable workspace views never present a create action', async () => {
  const loading = await renderWorkspace(null, { loading: true, unavailable: true }); assert.match(loading, /Loading workspace/); assert.doesNotMatch(loading, /Create workspace/);
  const failed = await renderWorkspace(null, { error: 'Unavailable', unavailable: true }); assert.match(failed, /Retry workspace/); assert.doesNotMatch(failed, /Create workspace/);
});
