import test from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_RECOVERY_KEY, claimChunkRecovery, isChunkLoadFailure } from '../src/lib/chunk-recovery.ts';

const chunkError = { name: 'ChunkLoadError', message: 'Loading chunk 123 failed.' };
function fixture() {
  const values = new Map([['existing-session', 'preserve-me']]);
  const writes = [];
  const storage = () => ({
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes.push({ key, value }); values.set(key, value); },
  });
  return { values, writes, storage };
}

for (const error of [
  chunkError,
  { message: 'Loading CSS chunk 987 failed.\n(error: https://fixture.invalid/asset.css)' },
  { message: 'Failed to fetch dynamically imported module: https://fixture.invalid/asset.js' },
  { message: 'error loading dynamically imported module' },
  { message: 'Importing a module script failed.' },
]) {
  test(`recognizes asset loading failure: ${error.message.split('\n')[0]}`, () => assert.equal(isChunkLoadFailure(error), true));
}

for (const error of [null, {}, { name: 'TypeError', message: 'Failed to fetch' }, { message: 'Cannot read properties of undefined' }]) {
  test(`does not reload unrelated runtime/network failure: ${JSON.stringify(error)}`, () => {
    const state = fixture();
    assert.equal(claimChunkRecovery({ error, online: true, storage: state.storage }), 'not_chunk_error');
    assert.deepEqual(state.writes, []);
  });
}

test('one guard survives subsequent errors, routes, releases, and component remounts', () => {
  const state = fixture();
  assert.equal(claimChunkRecovery({ error: chunkError, online: true, storage: state.storage }), 'reload');
  assert.equal(claimChunkRecovery({ error: { name: 'ChunkLoadError', message: 'Loading chunk different failed.' }, online: true, storage: state.storage }), 'already_attempted');
  assert.deepEqual(state.writes, [{ key: CHUNK_RECOVERY_KEY, value: 'attempted' }]);
  assert.equal(state.values.get('existing-session'), 'preserve-me');
  assert.equal(state.values.size, 2);
});

test('offline asset failure never claims or spends the automatic retry', () => {
  const state = fixture();
  assert.equal(claimChunkRecovery({ error: chunkError, online: false, storage: state.storage }), 'offline');
  assert.deepEqual(state.writes, []);
  assert.equal(claimChunkRecovery({ error: chunkError, online: true, storage: state.storage }), 'reload');
});

test('blocked session storage cannot cause an unguarded reload loop', () => {
  assert.equal(claimChunkRecovery({ error: chunkError, online: true, storage: () => { throw new Error('blocked'); } }), 'storage_unavailable');
});

test('readable but unwritable storage cannot cause an unguarded reload loop', () => {
  assert.equal(claimChunkRecovery({ error: chunkError, online: true, storage: () => ({
    getItem: () => null,
    setItem: () => { throw new Error('quota'); },
  }) }), 'storage_unavailable');
});

test('silently discarded storage writes also stop automatic recovery', () => {
  assert.equal(claimChunkRecovery({ error: chunkError, online: true, storage: () => ({ getItem: () => null, setItem: () => {} }) }), 'storage_unavailable');
});

test('an existing malformed guard fails closed without replacing it', () => {
  const state = fixture();
  state.values.set(CHUNK_RECOVERY_KEY, '');
  assert.equal(claimChunkRecovery({ error: chunkError, online: true, storage: state.storage }), 'already_attempted');
  assert.deepEqual(state.writes, []);
});
