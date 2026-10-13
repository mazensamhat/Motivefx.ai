import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';
const {renderToStaticMarkup}=siteRequire('react-dom/server');
const runtime=siteRequire('react/jsx-runtime');
test('health audits render cadence, structured findings and filters from the scoped history', async()=>{
  let query;
  const base={period_start:'2026-10-13T00:00:00Z',period_end:'2026-10-13T01:00:00Z',checked_at:'2026-10-13T01:01:00Z',issue_count:1,open_count:1,fixed_count:0,deployment_id:null,deployment_state:null};
  const page=await loadSiteModule('../apps/site/src/app/admin/(console)/health-audits/page.tsx', {
    'react/jsx-runtime':runtime,'@motivefx/database':{prisma:{$queryRawUnsafe:async sql=>{query=sql;return[
      {...base,id:'hourly',cadence:'hourly',status:'attention',summary:'Session check',details:{checks:[{title:'Session rotation',fixedState:'partial',verificationEvidence:'Fresh sign-in passed'}]}},
      {...base,id:'daily',cadence:'daily',status:'healthy',summary:'Daily marker',details:[]},
    ];}}},
  });
  const html=renderToStaticMarkup(await page.default({searchParams:Promise.resolve({cadence:'hourly',status:'attention'})}));
  assert.match(query,/WHERE product_key='motivefx'/); assert.match(query,/ORDER BY checked_at DESC\s+LIMIT 250/);
  assert.match(html,/Session rotation/); assert.match(html,/PARTIAL/); assert.match(html,/Fresh sign-in passed/);
  assert.doesNotMatch(html,/Daily marker/);
});
test('health audit database failure renders an empty history without crashing', async()=>{
  const errors=[];
  const page=await loadSiteModule('../apps/site/src/app/admin/(console)/health-audits/page.tsx', {
    'react/jsx-runtime':runtime,'@motivefx/database':{prisma:{$queryRawUnsafe:async()=>{throw Error('unavailable');}}},
  },'',{console:{error:(...args)=>errors.push(args)}});
  const html=renderToStaticMarkup(await page.default({}));
  assert.match(html,/Production Health &amp; Security/); assert.match(html,/No recorded hourly run yet/);
  assert.equal(errors.length,1);
});
