import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../web/node_modules/vite/dist/node/index.js';
import react from '../web/node_modules/@vitejs/plugin-react/dist/index.js';

const repo = fileURLToPath(new URL('..', import.meta.url));
const root = path.join(repo, 'test-results/chunk-recovery-fixture/source');
await mkdir(root, { recursive: true });
await writeFile(path.join(root, 'index.html'), '<!doctype html><html><head></head><body><script type="module" src="/entry.tsx"></script></body></html>');
await writeFile(path.join(root, 'entry.tsx'), `
import { createRoot } from 'react-dom/client';
import GlobalError from ${JSON.stringify(path.join(repo, 'apps/site/src/app/global-error.tsx'))};
const mode = new URLSearchParams(location.search).get('fixture') || 'fresh';
const boots = Number(sessionStorage.getItem('fixture:boots') || 0) + 1;
sessionStorage.setItem('fixture:boots', String(boots));
sessionStorage.setItem('fixture:session', 'preserved');
window.__fixtureBoots = boots;
const root = createRoot(document);
function healthy() { root.render(<html><head/><body><h1>Product preview fixture loaded</h1></body></html>); }
function failed(error) { root.render(<GlobalError error={error} reset={() => { window.__fixtureReset = true; healthy(); }}/>); }
async function missingChunk() {
  try { await import(/* @vite-ignore */ '/missing-stale-chunk.js'); }
  catch(error) { failed(error); }
}
window.__fixtureShowOffline = () => failed(Object.assign(new Error('Loading chunk 123 failed.'), {name:'ChunkLoadError'}));
if(mode === 'fresh' || (mode === 'transient' && boots > 1)) healthy();
else if(mode === 'offline') healthy();
else if(mode === 'generic') failed(new TypeError('Cannot read properties of undefined'));
else if(mode === 'blocked') {
  Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage blocked'); } });
  failed(Object.assign(new Error('Loading chunk 123 failed.'), {name:'ChunkLoadError'}));
} else void missingChunk();
`);
await build({
  configFile: false, root, plugins: [react()],
  define: { 'process.env.NEXT_PUBLIC_RELEASE_VERSION': JSON.stringify('fixture') },
  resolve: { alias: {
    react: path.join(repo, 'web/node_modules/react'),
    'react-dom': path.join(repo, 'web/node_modules/react-dom'),
  } },
  build: { outDir: path.join(root, '../dist'), emptyOutDir: true },
});
