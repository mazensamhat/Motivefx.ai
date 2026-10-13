import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadSiteModule} from './load-site-module.mjs';
test('track record preserves historical outcomes but excludes fabricated legacy confidence from calibration and replay',async()=>{
  const policy=await loadSiteModule('../apps/site/src/lib/ops/outcome-policy.ts');
  const validation=await loadSiteModule('../apps/site/src/lib/ops/outcome-validation.ts');
  const rows=[{symbol:'LEGACY',engineVersion:'MOTIVE_SIGNAL_V4_2',confidence:99},{symbol:'CURRENT',engineVersion:'MOTIVE_SIGNAL_V4_3_EVIDENCE_CONFIDENCE',confidence:72}].map(r=>({...r,motiveSignal:70,recordedAt:new Date(0),evidenceJson:'[]',outcomes:[]}));
  const route=await loadSiteModule('../apps/site/src/app/api/intel/track-record/route.ts',{
    '@motivefx/database':{prisma:{signalSnapshot:{count:async()=>2,findMany:async()=>rows},signalOutcome:{count:async()=>0,findMany:async()=>[{symbol:'LEGACY',predictedConf:99,outcome:'PARTIAL',evaluatedAt:new Date(0),snapshot:{recordedAt:new Date(0),engineVersion:'MOTIVE_SIGNAL_V4_2'}}]}}},
    '@/lib/api':{json:v=>v},'@/lib/terminal/access':{requireFeature(){}},
    '@/lib/ops/outcome-validation':validation,
    '@/lib/terminal/auth':{requireTerminalSession:async()=>({ok:true,session:{user:{id:'qa'}}}),accessErrorResponse:e=>{throw e;}},
    '@/lib/terminal/ios-reader':{entitlementsPlanForUser:async()=>({})},'@/lib/ops/outcome-policy':policy,
  });
  const result=await route.GET();
  assert.equal(result.resolvedOutcomes,1); assert.equal(result.calibration.evaluated,0);
  assert.equal(result.recentOutcomes[0].predictedConf,null);
  assert.equal(result.replay.find(r=>r.symbol==='LEGACY').confidence,null);
  assert.equal(result.replay.find(r=>r.symbol==='LEGACY').history[0].confidence,null);
  assert.equal(result.replay.find(r=>r.symbol==='CURRENT').confidence,72);
});
