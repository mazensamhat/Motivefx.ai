"""Compiled V2 trust-layer regression: Track Record, Replay, Watch Agents.
Controlled API fixtures only. No customer data or live account mutations.
"""
from pathlib import Path
import importlib.util, json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('responsive_fixture', ROOT/'tests/responsive-layout.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
OUT=ROOT/'test-results/v2-trust';OUT.mkdir(parents=True,exist_ok=True)

r.RESP['/api/intel/track-record']={
 'generatedAt':'2026-10-03T05:00:00Z','snapshotCount':21123,'pendingOutcomes':16058,
 'resolvedOutcomes':0,'minimumResolvedForScore':30,'readiness':'COLLECTING_OUTCOMES',
 'score':None,'note':'Track Record is collecting resolved outcomes. 0/30 minimum resolved outcomes available; no score is shown yet.',
 'replay':[
   {'symbol':'NVDA','currentSignal':72,'previousSignal':68,'delta':4,'confidence':81,'stance':'would_hold','engineVersion':'qa-v1','recordedAt':'2026-10-03T04:00:00Z',
    'history':[{'motiveSignal':72,'confidence':81,'stance':'would_hold','recordedAt':'2026-10-03T04:00:00Z'},{'motiveSignal':68,'confidence':78,'stance':'hold','recordedAt':'2026-10-02T04:00:00Z'}]},
   {'symbol':'BTC','currentSignal':61,'previousSignal':64,'delta':-3,'confidence':75,'stance':'hold','engineVersion':'qa-v1','recordedAt':'2026-10-03T04:00:00Z',
    'history':[{'motiveSignal':61,'confidence':75,'stance':'hold','recordedAt':'2026-10-03T04:00:00Z'}]},
 ]
}
r.BRIEF['alertRules']=[
 {'id':'qa-rule-1','kind':'probability_above','threshold':70,'themeId':'theme-0','enabled':True,'label':'Theme strength above 70'},
 {'id':'qa-rule-2','kind':'divergence_above','threshold':65,'enabled':False,'label':'Consensus break above 65'},
]
r.BRIEF['themeWatchlist']=[{'id':'theme-0','theme':'Oil and inflation','source':'user','probability':64,'addedAt':'2026-10-02T00:00:00Z'}]

WRAP_FETCH="""() => {
 const original=window.fetch; window.__prefWrites=[];
 window.fetch=async(url,init)=>{
   const path=new URL(String(url),'https://qa.local').pathname;
   if(path==='/api/intel/prefs' && init?.method==='PUT'){
     window.__prefWrites.push(JSON.parse(init.body));
     return Response.json({prefs:JSON.parse(init.body).prefs});
   }
   return original(url,init);
 };
}"""

with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox']}
 if os.getenv('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
 browser=p.chromium.launch(**opts)
 cases=[]
 for mode,width,theme in [('web',390,'light'),('android',390,'dark'),('web',1440,'dark')]:
   ctx,page,errors=r.render(browser,width,mode)
   page.get_by_role('button',name='Pro',exact=True).click()
   page.wait_for_timeout(120)
   page.wait_for_selector('#v2-track-record',timeout=5000)
   if page.evaluate('document.documentElement.dataset.colorTheme')!=theme: page.locator('.theme-toggle').evaluate('(e)=>e.click()')
   page.evaluate(WRAP_FETCH)
   track=page.locator('#v2-track-record')
   assert '21,123' in track.inner_text()
   assert '16,058' in track.inner_text()
   assert '0/30' in track.inner_text()
   assert 'Collecting' in track.inner_text()
   assert track.locator('.v2-replay-card').count()==2
   assert 'NVDA' in track.inner_text() and 'BTC' in track.inner_text()
   page.locator('.sidebar-apps-btn').filter(has_text='Track Record & Replay').evaluate('(e)=>e.click()')
   page.wait_for_timeout(100)
   assert track.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.right<=document.documentElement.clientWidth+2&&e.scrollWidth<=e.clientWidth+2}')
   agents=page.locator('#v2-watch-agents')
   assert agents.is_visible()
   assert 'Active agents' in agents.inner_text() and '1' in agents.inner_text()
   page.locator('.sidebar-apps-btn').filter(has_text='Watch Agents').evaluate('(e)=>e.click()')
   page.wait_for_timeout(100)
   assert agents.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.right<=document.documentElement.clientWidth+2&&e.scrollWidth<=e.clientWidth+2}')
   agents.get_by_role('button',name='Pause',exact=True).click()
   page.wait_for_timeout(100)
   writes=page.evaluate('window.__prefWrites')
   assert len(writes)==1 and writes[0]['prefs']['alertRules'][0]['enabled'] is False
   assert not errors,errors
   page.screenshot(path=str(OUT/f'trust-{mode}-{width}-{theme}.png'),full_page=True)
   cases.append({'mode':mode,'width':width,'theme':theme,'replayCards':2,'watchRuleToggled':True})
   ctx.close()
 browser.close()
(OUT/'report.json').write_text(json.dumps({'cases':cases,'data':'Controlled API fixtures, not production account data'},indent=2))
print(f'PASS: {len(cases)} compiled V2 trust-layer scenarios.')
