"""Compiled browser regression with isolated API fixtures, never production data."""
import json,mimetypes
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]/'web/dist'
OUT=Path(__file__).resolve().parents[1]/'test-results/portfolio';OUT.mkdir(parents=True,exist_ok=True)
HOST='https://motivefx-qa.invalid'
USER='qa-isolated-member'
FEATURES=['ai_brief','ask_motive','research_briefs_limited','following','market_intelligence','research_briefs_unlimited','portfolio_intelligence','ai_memory','since_you_were_away','push_notifications','motive_daily_email','voice_briefing','motive_daily_voice','decision_history','advanced_analytics','api_access','multiple_portfolios','team_workspace','beta_features','concierge_support','white_glove_onboarding','direct_product_feedback','early_ai_models']
plan={'tier':'elite','active':['trades','crypto','penny','betting','predictions'],'allowedMarkets':['trades','crypto','penny','betting','predictions'],'selectedMarkets':['stocks','crypto','pink_slips','sports_betting','prediction_markets'],'features':dict.fromkeys(FEATURES,True),'entitlements':FEATURES,'hasAnnual':True,'hasSubscription':True,'annualPrice':1299,'catalog':{},'simulation':{'active':False,'expiresAt':None,'bankroll':0,'modules':[],'daysRemaining':0}}
auth={'user':{'id':USER,'email':'qa@example.test','intelligenceTier':'elite','hasSubscription':True,'selectedMarkets':plan['selectedMarkets'],'isAdmin':False},'modules':plan}
bets=[{'id':'qa-nhl','matchup':'Philadelphia Flyers @ NJ Devils','pick':'Devils +105','odds':'+105','sport':'NHL','stake':0,'status':'open','created_at':'2026-10-02T00:18:22Z'},{'id':'qa-nfl','matchup':'Buffalo Bills @ KC Chiefs','pick':'Bills +120','odds':'+120','sport':'NFL','stake':10,'status':'open'}]
positions=[{'id':'qa-sports','market':'Steelers vs. Browns','category':'sports','pick':'Yes','stake':0,'yes_price':0.57,'status':'open'},{'id':'qa-politics','market':'QA election market','category':'politics','pick':'No','stake':0,'yes_price':0.44,'status':'open'}]
holdings={'trades':[{'symbol':'QA_TSLA','shares':15,'avg_cost':345}],'crypto':[{'symbol':'SHIB','amount':40025290,'avg_cost':0.00004}],'penny':[{'symbol':'QA_PINK','shares':1000,'avg_cost':0.05}]}
brief={'greeting':'QA briefing','generatedAt':'2026-10-02T00:00:00Z','opportunities':[],'probabilityViews':[],'moduleSummaries':[],'motivfxScore':50,'marketConfidence':'MODERATE','stars':3,'opportunityCount':0,'highRiskAlerts':0,'breakingNewsCount':0,'personalized':{'holdingsCount':3,'radarHits':[]},'audioBriefingScript':'','compareLens':[],'moduleStories':{},'sentiment':{'news':'neutral','x':'neutral','reddit':'neutral'}}
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 def setup(width=1440,auth_fail=False,hold_fail=False):
  c=browser.new_context(viewport={'width':width,'height':1000})
  c.add_init_script("localStorage.setItem('motivefx_age_verified','1');localStorage.setItem('motivefx_theme','light');localStorage.setItem('motivefx_gen_cohort','millennial');localStorage.setItem('motivefx_profile_done','1');sessionStorage.setItem('motivefx_platform_setup_dismissed','1');localStorage.setItem('motivefx_intel_tour_seen','1');sessionStorage.setItem('motivefx_welcome_hook','1');")
  s={'auth_fail':auth_fail,'hold_fail':hold_fail,'counts':{},'writes':[],'errors':[],'ai_fail':False}
  def route(r):
   u=urlsplit(r.request.url);path=u.path
   if '/api/' not in path:
    if u.hostname!='motivefx-qa.invalid':r.abort();return
    f=ROOT/path.removeprefix('/terminal/')
    if f.is_dir():f=f/'index.html'
    if f.exists():r.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    else:r.fulfill(status=404,body='Missing QA asset')
    return
   s['counts'][path]=s['counts'].get(path,0)+1
   if r.request.method!='GET':s['writes'].append({'path':path,'body':r.request.post_data})
   status=200;d={'items':[],'prefs':{},'records':[],'total':0}
   if path=='/api/auth/me':status=503 if s['auth_fail'] else 200;d={'code':'session_unavailable'} if s['auth_fail'] else auth
   elif path.endswith('/health'):d={'feeds':{},'quota':{}}
   elif '/portfolio/books' in path:d={'books':{'activeId':'primary','books':[{'id':'primary','name':'Primary'}]}}
   elif '/portfolio/' in path:
    mod=path.split('/advisor/')[1].split('/')[0] if '/advisor/' in path else 'trades'
    status=503 if s['hold_fail'] else 200;d={'holdings':holdings.get(mod,[])}
   elif '/betting/bets/' in path:d={'bets':bets}
   elif '/predictions/positions/' in path:d={'positions':positions}
   elif '/modules/' in path:d=plan
   elif '/home/briefing' in path:d=brief
   elif '/analyze' in path:d={'summary':'QA analysis with controlled data','recommendations':[],'deep_scans':[],'picks':[]}
   elif '/platform-prefs/' in path:d={'prefs':{},'platforms':[],'modules':[]}
   elif '/ask-motive' in path:status=503 if s['ai_fail'] else 200;d={'error':'QA unavailable'} if s['ai_fail'] else {'reply':'QA response: the NHL entry is classified as hockey.','actions':[],'followUps':[]}
   elif '/pulse' in path:d={'badges':{},'modules':[]}
   r.fulfill(status=status,content_type='application/json',body=json.dumps(d))
  c.route('**/*',route);page=c.new_page();page.on('pageerror',lambda e:s['errors'].append(str(e)));page.set_default_timeout(10000)
  return c,page,s
 def enter(page,tab):page.goto(HOST+'/terminal/?tab='+tab)
 def passed(c,s,case):
  assert not s['errors'],s['errors'];results.append({'case':case,'status':'PASS'});c.close()
 try:
  c,page,s=setup(auth_fail=True);enter(page,'stocks');page.get_by_role('heading',name='We could not verify your session').wait_for()
  assert sum(s['counts'].values())==1,s['counts']
  s['auth_fail']=False;page.get_by_role('button',name='Retry session check').click();page.get_by_role('heading',name='Holdings Ledger').wait_for();page.get_by_text('$QA_TSLA',exact=True).wait_for()
  assert s['counts']['/api/auth/me']==2,s['counts'];assert not any('/advisor/modules/' in k for k in s['counts']),s['counts']
  passed(c,s,'auth failure is not a guest or downgrade; retry restores verified paid markets without extra module call')
  for width in (1440,390):
   c,page,s=setup(width=width,hold_fail=True);enter(page,'stocks');page.get_by_text('Your saved holdings could not be loaded.',exact=False).wait_for()
   page.get_by_label('Holding symbol',exact=True).fill('NVDA');page.get_by_label('Holding quantity',exact=True).fill('1')
   assert page.get_by_role('button',name='+ Add holding',exact=True).is_disabled();assert not any('/portfolio' in w['path'] for w in s['writes'])
   s['hold_fail']=False;page.get_by_role('button',name='Retry holdings').click();page.get_by_text('$QA_TSLA',exact=True).wait_for()
   s['hold_fail']=True;page.get_by_role('button',name='Refresh saved holdings',exact=True).click();page.get_by_role('button',name='Retry holdings').wait_for()
   assert page.get_by_text('$QA_TSLA',exact=True).count()==1;assert page.get_by_role('button',name='+ Add holding',exact=True).is_disabled()
   page.get_by_role('heading',name='Unusual Options Flow',exact=True).wait_for();page.get_by_role('heading',name='Stock Activity',exact=True).wait_for()
   page.screenshot(path=str(OUT/f'holdings-failed-read-{width}.png'),full_page=True);passed(c,s,f'holdings retained, edits protected, stock activity and screener present {width}')
   for tab,symbol,headers in [('crypto','$SHIB',['Whale Alerts','Crypto Spot Activity']),('penny','$QA_PINK',['Garage Movers','Volume Spikes'])]:
    c,page,s=setup(width=width);enter(page,tab);page.get_by_text(symbol,exact=True).wait_for()
    for header in headers:page.get_by_role('heading',name=header,exact=True).wait_for()
    passed(c,s,f'{tab} saved holdings and market screens remain available {width}')
   c,page,s=setup(width=width);enter(page,'betting');page.get_by_role('combobox',name='Filter saved bets',exact=True).wait_for();page.get_by_text('Philadelphia Flyers @ NJ Devils',exact=True).wait_for()
   page.get_by_role('combobox',name='Filter saved bets',exact=True).select_option('hockey');assert page.get_by_text('Buffalo Bills @ KC Chiefs',exact=True).count()==0
   assert page.get_by_role('combobox',name='Sport for new bet',exact=True).input_value()==''
   page.get_by_text('Philadelphia Flyers @ NJ Devils',exact=True).click();page.get_by_label('Details for Philadelphia Flyers @ NJ Devils',exact=True).wait_for();assert page.get_by_text('Hockey · NHL',exact=True).count()>=1
   page.screenshot(path=str(OUT/f'nhl-review-{width}.png'),full_page=True)
   page.get_by_role('button',name='Ask Motive about this entry',exact=True).click();message=page.get_by_role('textbox',name='Message',exact=True);message.wait_for();assert 'Devils' in message.input_value()
   s['ai_fail']=True;page.get_by_role('button',name='Send message',exact=True).click();page.get_by_role('button',name='Retry question',exact=True).wait_for();assert 'Devils' in message.input_value()
   s['ai_fail']=False;page.get_by_role('button',name='Retry question',exact=True).click();page.get_by_text('QA response: the NHL entry is classified as hockey.',exact=True).wait_for()
   assert page.locator('.chief-bubble-user').count()==1;passed(c,s,f'NHL filter, saved review, assistant handoff and retry {width}')
   c,page,s=setup(width=width);enter(page,'predictions');page.get_by_role('combobox',name='Filter saved predictions',exact=True).wait_for();page.get_by_text('Steelers vs. Browns',exact=True).wait_for()
   page.get_by_role('combobox',name='Filter saved predictions',exact=True).select_option('sports');assert page.get_by_text('QA election market',exact=True).count()==0
   page.get_by_text('Steelers vs. Browns',exact=True).click();page.get_by_label('Details for Steelers vs. Browns',exact=True).wait_for()
   page.get_by_role('combobox',name='Filter saved predictions',exact=True).select_option('politics');assert page.get_by_text('Steelers vs. Browns',exact=True).count()==0;page.get_by_text('QA election market',exact=True).wait_for()
   passed(c,s,f'prediction category filters and saved review {width}')
 except Exception:
  try:page.screenshot(path=str(OUT/'failure.png'),full_page=True);(OUT/'failure-state.json').write_text(json.dumps(s,indent=2));(OUT/'failure-page.txt').write_text(page.locator('body').inner_text())
  except Exception:pass
  raise
 finally:
  (OUT/'report.json').write_text(json.dumps(results,indent=2));browser.close()
print(json.dumps(results,indent=2))
