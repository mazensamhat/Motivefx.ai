"""Compiled final V2 roadmap coverage using controlled API fixtures.
No production customer data, provider calls, trades, bets or purchases.
"""
from pathlib import Path
import importlib.util, json, os
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("responsive_fixture",ROOT/"tests/responsive-layout.py")
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
from playwright.sync_api import sync_playwright
OUT=ROOT/"test-results/v2-roadmap";OUT.mkdir(parents=True,exist_ok=True)
r.RESP["/api/intel/portfolio-intelligence"]={
 "generatedAt":"2026-10-03T22:00:00Z","counts":{"assets":2,"trades":1,"crypto":1,"penny":0,"bets":1,"predictions":1,"watchlist":2},
 "posture":{"strong":1,"weak":0,"changing":1,"unknown":0},
 "holdings":[{"module":"trades","symbol":"NVDA","shares":2,"motiveSignal":78,"evidenceConfidence":82,"stance":"would_hold","delta":12,"signalBand":"strong"},
             {"module":"crypto","symbol":"BTC","amount":.2,"motiveSignal":61,"evidenceConfidence":73,"stance":"hold","delta":-3,"signalBand":"mixed"}],
 "openBets":[],"openPredictions":[],"watchlist":[],"note":"QA fixture"
}
r.RESP["/api/intel/market-close"]={
 "generatedAt":"2026-10-03T22:00:00Z","windowHours":48,"newSnapshots":123,
 "strengthened":[{"symbol":"NVDA","module":"trades","current":78,"previous":66,"delta":12,"confidence":82,"stance":"would_hold","recordedAt":"2026-10-03T22:00:00Z"}],
 "weakened":[{"symbol":"BTC","module":"crypto","current":61,"previous":70,"delta":-9,"confidence":73,"stance":"hold","recordedAt":"2026-10-03T22:00:00Z"}],
 "steady":[],"portfolioRelevant":[],"note":"QA fixture"
}
r.RESP["/api/intel/track-record"]={
 "generatedAt":"2026-10-03T22:00:00Z","snapshotCount":25000,"pendingOutcomes":19000,"inconclusiveOutcomes":2,"resolvedOutcomes":0,
 "minimumResolvedForScore":30,"readiness":"COLLECTING_OUTCOMES","observedReliability":None,
 "outcomeBreakdown":{"confirmed":0,"partial":0,"rejected":0},
 "note":"Track Record is collecting market-grounded outcomes. 0/30 minimum resolved outcomes available; no reliability score is shown yet.",
 "coverage":{"supported":["Stocks / Pink Sheets","Mapped crypto"],"pending":["Sports events","Prediction markets"],"note":"Unsupported outcomes remain pending."},
 "resolved":[],"replay":[{"symbol":"NVDA","currentSignal":78,"previousSignal":66,"delta":12,"confidence":82,"stance":"would_hold","engineVersion":"qa","recordedAt":"2026-10-03T22:00:00Z","evidence":["Desk signal","Finnhub"],"history":[{"motiveSignal":78,"confidence":82,"stance":"would_hold","recordedAt":"2026-10-03T22:00:00Z","evidence":["Desk signal"]},{"motiveSignal":66,"confidence":75,"stance":"hold","recordedAt":"2026-10-02T22:00:00Z","evidence":["Prior evidence"]}]}]
}
r.BRIEF["alertRules"]=[
 {"id":"default-prob-75","kind":"probability_above","threshold":75,"enabled":True,"label":"Motive Signal ≥ 75"},
 {"id":"agent-qa","kind":"signal_change","threshold":10,"symbol":"NVDA","module":"trades","enabled":True,"label":"NVDA changes ≥ 10","cadence":"continuous","delivery":"intel"}
]
r.BRIEF["themeWatchlist"]=[]
CASES=[]
def fit(page,selector):
 el=page.locator(selector);assert el.count()>0 and el.first.is_visible(),selector
 assert el.first.evaluate("(e)=>{const r=e.getBoundingClientRect();return r.left>=-2&&r.right<=document.documentElement.clientWidth+2&&e.scrollWidth<=e.clientWidth+2}"),selector
with sync_playwright() as p:
 opts={"headless":True,"args":["--no-sandbox"]}
 if os.getenv("CHROMIUM_PATH"):opts["executable_path"]=os.environ["CHROMIUM_PATH"]
 browser=p.chromium.launch(**opts)
 for mode,width,theme in [("web",390,"light"),("android",390,"dark"),("ios",768,"light"),("web",1440,"dark")]:
  ctx,page,errors=r.render(browser,width,mode)
  if page.evaluate("document.documentElement.dataset.colorTheme")!=theme:page.locator(".theme-toggle").evaluate("(e)=>e.click()")
  page.evaluate("""() => {const original=window.fetch;window.__roadmapWrites=[];window.fetch=async(url,init)=>{const path=new URL(String(url),'https://qa.local').pathname;if(path==='/api/intel/prefs'&&init?.method==='PUT'){const body=JSON.parse(init.body);window.__roadmapWrites.push(body);return Response.json({prefs:body.prefs});}return original(url,init);};}""")
  for label,selector in [("Discover / Scanner","#v2-discover"),("Portfolio Intelligence","#v2-portfolio-intelligence"),("Market Close","#v2-market-close"),("Track Record & Replay","#v2-track-record"),("Watch Agents","#v2-watch-agents")]:
   page.locator(".sidebar-apps-btn").filter(has_text=label).evaluate("(e)=>e.click()");page.wait_for_timeout(100);fit(page,selector)
  assert "25,000" in page.locator("#v2-track-record").inner_text()
  page.locator(".v2-replay-card-hit").first.click();assert page.locator(".v2-replay-point").count()==2
  scanner=page.locator("#v2-discover");scanner.get_by_label("Minimum Motive Signal").select_option("70");assert scanner.locator(".v2-scanner-card").count()>=1
  before=page.locator("#v2-watch-agents .v2-agent-list li").count()
  page.locator("#v2-watch-agents").get_by_label("Agent symbol").fill("BTC")
  page.locator("#v2-watch-agents").get_by_role("button",name="Create Watch Agent").click();page.wait_for_timeout(120)
  assert page.evaluate("window.__roadmapWrites.length")==1
  page.locator(".sidebar-apps-btn").filter(has_text="Pro Intelligence").evaluate("(e)=>e.click()");page.wait_for_timeout(120)
  assert page.get_by_role("button",name="Hide Pro").is_visible()
  assert page.locator(".phase2-intel").is_visible()
  fit(page,"#v2-pro-intelligence")
  assert not errors,errors
  CASES.append({"mode":mode,"width":width,"theme":theme,"agentRowsBefore":before})
  page.screenshot(path=str(OUT/f"roadmap-{mode}-{width}-{theme}.png"),full_page=True)
  ctx.close()
 browser.close()
(OUT/"report.json").write_text(json.dumps({"cases":CASES,"data":"Controlled API fixtures; no customer data"},indent=2))
print(f"PASS: {len(CASES)} compiled final-roadmap scenarios.")
