"""Compiled V2 completion regression with controlled APIs only."""
from pathlib import Path
import importlib.util, json, os
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/responsive-layout.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
from playwright.sync_api import sync_playwright
OUT=ROOT/'test-results/v2-complete';OUT.mkdir(parents=True,exist_ok=True)

r.BRIEF['watchAgents']=[{'id':'agent-1','name':'Watch BTC below 45','symbol':'BTC','metric':'signal','operator':'below','threshold':45,'enabled':True,'createdAt':'2026-10-03T00:00:00Z'}]
r.BRIEF['opportunities'][0]['deltaVsPrior']=5
r.BRIEF['personalized']['radarHits']=[{'id':'0','symbol':'NVDA','title':'QA','module':'trades','confidence':74}]
r.RESP['/api/intel/portfolio-intelligence']={
 'generatedAt':'2026-10-03T00:00:00Z','totalPositions':3,'signalCoverage':2,'watchlistCount':1,
 'marketCounts':[{'module':'trades','count':1},{'module':'crypto','count':1},{'module':'predictions','count':1}],
 'concentration':{'module':'trades','count':1,'sharePct':33},'note':'Count-based QA fixture',
 'positions':[{'module':'trades','label':'Stocks','symbol':'NVDA','quantity':2,'avgCost':100,'motiveSignal':72,'evidenceConfidence':81,'stance':'would_hold','signalChange':4,'signalRecordedAt':'2026-10-03T00:00:00Z'},
              {'module':'crypto','label':'Crypto','symbol':'BTC','quantity':1,'avgCost':None,'motiveSignal':61,'evidenceConfidence':75,'stance':'hold','signalChange':-3,'signalRecordedAt':'2026-10-03T00:00:00Z'}]
}
r.RESP['/api/intel/market-close']={
 'generatedAt':'2026-10-03T00:00:00Z','note':'Recorded QA tape, not realized performance',
 'strengthened':[{'symbol':'NVDA','motiveSignal':72,'delta':4}],
 'weakened':[{'symbol':'BTC','motiveSignal':61,'delta':-3}],
 'steady':[],'newSignals':[],'carryForward':[{'symbol':'NVDA','motiveSignal':72,'delta':4}]
}
r.RESP['/api/intel/track-record']={
 'generatedAt':'2026-10-03T00:00:00Z','snapshotCount':25000,'pendingOutcomes':100,'inconclusiveOutcomes':50,'resolvedOutcomes':35,
 'minimumResolvedForScore':30,'minimumDistinctSymbols':3,'distinctResolvedSymbols':3,'observedAlignment':64.3,'readiness':'READY','score':64.3,
 'note':'Observed alignment QA fixture, not probability',
 'replay':[{'symbol':'NVDA','currentSignal':72,'previousSignal':68,'delta':4,'confidence':81,'stance':'would_hold','engineVersion':'qa','recordedAt':'2026-10-03T00:00:00Z',
 'history':[{'motiveSignal':72,'confidence':81,'stance':'would_hold','recordedAt':'2026-10-03T00:00:00Z','evidence':[{'label':'Desk signal','score':72,'provider':'QA','sourceType':'LIVE'}],
 'outcome':{'status':'CONFIRMED','realizedReturnPct':2.1,'entryPrice':100,'outcomePrice':102.1,'evaluatedAt':'2026-10-03T00:00:00Z','notes':'QA observed close'}}]}]
}

with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox']}
 if os.getenv('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
 browser=p.chromium.launch(**opts);cases=[]
 for mode,width in [('web',390),('android',390),('ios',768),('web',1440)]:
  ctx,page,errors=r.render(browser,width,mode)
  page.get_by_role('button',name='Pro',exact=True).click();page.wait_for_timeout(250)
  assert page.locator('#v2-discover').is_visible()
  assert page.locator('#v2-portfolio-intelligence').is_visible()
  assert page.locator('#v2-market-close').is_visible()
  assert page.locator('#v2-track-record').is_visible()
  assert page.locator('#v2-watch-agents').is_visible()
  assert 'NVDA' in page.locator('#v2-portfolio-intelligence').inner_text()
  page.locator('#v2-market-close').get_by_text('Strengthened',exact=True).wait_for(timeout=3000)
  assert 'Strengthened' in page.locator('#v2-market-close').inner_text()
  page.locator('#v2-track-record').get_by_role('button',name='Open replay',exact=True).click()
  assert 'recorded timeline' in page.locator('#v2-track-record').inner_text()
  page.get_by_role('button',name='Simple',exact=True).click();page.wait_for_timeout(100)
  assert page.locator('#v2-discover').is_visible()
  assert page.locator('#v2-portfolio-intelligence').count()==0
  page.locator('.sidebar-apps-btn').filter(has_text='Portfolio Intelligence').evaluate('(e)=>e.click()');page.wait_for_timeout(180)
  assert page.locator('#v2-portfolio-intelligence').is_visible()
  assert page.evaluate("localStorage.getItem('motivefx_disclosure')")=='pro'
  bad=page.evaluate(r.CHECK,'.v2-home,.v2-discover,.v2-completion-panel,.v2-trust-section,.v2-replay-timeline')
  assert not bad,(mode,width,bad)
  assert not errors,errors
  page.screenshot(path=str(OUT/f'v2-complete-{mode}-{width}.png'),full_page=True)
  cases.append({'mode':mode,'width':width})
  ctx.close()
 browser.close()
(OUT/'report.json').write_text(json.dumps({'cases':cases,'data':'Controlled API fixtures only'},indent=2))
print(f'PASS: {len(cases)} compiled V2 completion scenarios.')
