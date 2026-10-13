import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
export const siteRequire = createRequire(new URL('../apps/site/package.json', import.meta.url));
const ts = createRequire(new URL('../web/package.json', import.meta.url))('typescript');
export async function loadSiteModule(relative, mocks = {}, append = '', globals = {}) {
  const module = { exports: {} };
  const source = await readFile(new URL(relative, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source + append, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, process, Date, URL, URLSearchParams, TextEncoder,
    Uint8Array, Request, console, setTimeout, clearTimeout, ...globals,
    require: name => { if (name in mocks) return mocks[name]; throw Error(`Unexpected dependency ${name}`); },
  });
  return module.exports;
}
