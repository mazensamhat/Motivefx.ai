"""Render the compiled React app with isolated QA API responses.
Checks child geometry as well as root scrollWidth: overflow:hidden must not mask failure.
No production login, customer records, provider calls, or financial actions are used.
Run after VITE_BASE=/terminal/ npm --prefix web run build.
"""
import base64
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = Path(os.environ.get('MOTIVE_TEST_DIST', ROOT / 'web/dist'))
OUT = ROOT / 'test-results/responsive'
NOW = '2026-10-02T04:00:00Z'
LONG = 'Chicago Blackhawks @ Utah Mammoth: line movement, institutional activity and cross-market evidence are mixed. Review available sources and possible risks before deciding.'
MODULES = ['trades', 'penny', 'crypto', 'betting', 'predictions']
LABELS = ['Stocks', 'Pink Sheets', 'Crypto', 'Sports', 'Predictions']
BRIEF = dict(
    greeting='Good morning, QA', tagline='QA fixture, not live financial data', motivfxScore=62,
    stars=3, marketConfidence='MODERATE', opportunityCount=5, highRiskAlerts=2,
    biggestRisk=LONG, biggestOpportunity='Oil and inflation', topAiTip=LONG,
    breakingNewsCount=3, generatedAt=NOW, sentiment=dict(reddit='neutral', x='neutral', news='neutral'),
    personalized=dict(holdingsCount=2, watchlistCount=0, radarSignalCount=1, radarHits=[]),
    moduleSummaries=[dict(module=m, label=l, count=2, tab='stocks' if m == 'trades' else m, newSignals=1) for m, l in zip(MODULES, LABELS)],
    opportunities=[dict(id=str(i), module=m, symbol=s, title=LONG, confidence=74-i, riskLevel='medium', stars=3, reasons=[LONG], signals=['momentum'], stance='watch', expectedMove='Not a forecast', beneficiaries=['Research'], direction='neutral') for i, (m, s) in enumerate(zip(MODULES, ['NVDA', 'AMC', 'BTC', 'Chicago Blackhawks @ Utah Mammoth', 'Interest-rate decision']))],
    probabilityViews=[dict(id=f'theme-{i}', theme=t, probability=64, confidence=80, direction='up', supportingFactors=[LONG], alternatives=[LONG], relatedSymbols=['NVDA'], beneficiaries=['Energy'], timing='Near-term research window', deltaVsPrior=0) for i, t in enumerate(['Oil and inflation', 'Semiconductors and AI investment', 'Interest rates and consumer spending'])],
    consensusBreaks=[dict(id=f'break-{i}', claim=LONG, breakReason=LONG, divergenceScore=70-i, relatedSymbols=['BTC'], deltaVsPrior=0) for i in range(3)],
    themeWatchlist=[], themeSuggestions=[], alertRules=[], compareLens=[],
    futureScenarios=dict(seedEvent=LONG, horizon='30–90 days', branches=[dict(id='b1', label='Base case', probability=60, effects=[LONG], invalidators=[LONG])], disclaimer='QA fixture', generatedAt=NOW),
)
BRIEF['signalGraph'] = dict(nodes=[dict(id='oil', label='Oil', kind='macro')] + [dict(id=str(i), label=label, kind='industry') for i, label in enumerate(['Inflation', 'Energy', 'Shipping', 'Currencies', 'Automotive', 'Construction', 'Retail', 'Housing'])], edges=[{'from':'oil', 'to':str(i), 'relation':'cost pressure and related exposure', 'weight':.92-i*.02} for i in range(8)], activeNodeId='oil', generatedAt=NOW)
RESP = {
    '/api/auth/me': dict(user=dict(id='qa', email='qa@example.test', intelligenceTier='elite', hasSubscription=True, selectedMarkets=['stocks', 'crypto', 'pink_slips', 'sports_betting', 'prediction_markets'])),
    '/api/home/briefing': BRIEF, '/api/health': dict(feeds={}, quota={}),
    '/api/live-feed': dict(events=[dict(type='crypto', message='QA fixture: BTC activity feed for responsive testing')]),
    '/api/institutional/workspace': dict(dashboard=dict(team=None, members=[], notes=[], prefs=dict(scenarioTemplates=[]), apiKeyCount=0)),
    '/api/institutional/keys': dict(keys=[]),
    '/api/terminal/portfolio/books': dict(books=dict(activeId='primary', books=[dict(id='primary', name='Primary')])),
    '/api/stocks/unusual-options': dict(items=[dict(symbol='QA', type='call', strike=50, volume=2000, openInterest=900, premium=100000, sentiment='neutral', note=LONG)]),
    '/api/stocks/congress-trades': dict(items=[dict(politician='QA Disclosure Example', symbol='QA', transaction='purchase', amount='$1,001–$15,000', filedAt=NOW)]),
    '/api/crypto/whale-alerts': dict(items=[dict(asset='BTC', amountUsd=1234567, **{'from':'QA wallet', 'to':'QA exchange'}, direction='deposit', note=LONG)]),
    '/api/penny/movers': dict(items=[dict(symbol='AMC', price=5.67, changePct=8.1, volume=100000, volRatio=3.1, sentiment='neutral', note=LONG)]),
    '/api/penny/volume-spikes': dict(items=[dict(symbol='SNDL', price=3.2, changePct=5.6, volume=100000, volRatio=2.3, sentiment='neutral', note=LONG)]),
    '/api/betting/line-moves': dict(items=[dict(matchup='Chicago Blackhawks @ Utah Mammoth', sport='icehockey_nhl', currentLine='Utah -114', openingLine='Utah -110', book='QA book', direction='up', timestamp=NOW)]),
    '/api/betting/sharp-action': dict(items=[dict(matchup='Chicago Blackhawks @ Utah Mammoth', publicPct=55, moneyPct=60, sharpSide='Utah', signal='Mixed', confidence='Moderate')]),
    '/api/predictions/markets': dict(items=[dict(market='QA test: rate-decision prediction with a long descriptive title', yes=57, no=43, volume24h='$123K', category='economy', platform='QA provider')]),
}
STORAGE = """() => {const storage=()=>{const d={};return {getItem:k=>d[k]??null,setItem:(k,v)=>{d[k]=String(v)},removeItem:k=>delete d[k]}};Object.defineProperty(document,'cookie',{value:'',writable:true});Object.defineProperty(window,'localStorage',{value:storage()});Object.defineProperty(window,'sessionStorage',{value:storage()});}"""
INIT = """localStorage.setItem('motivefx_age_verified','1');localStorage.setItem('motivefx_profile_done','1');localStorage.setItem('motivefx_gen_cohort','millennial');localStorage.setItem('motivefx_intel_tour_seen','1');localStorage.setItem('motivefx_theme','light');sessionStorage.setItem('motivefx_platform_setup_dismissed','1');"""
FETCH = """(values)=>{window.__qaResponses=values;window.__qaRequests=[];window.fetch=async(u,init)=>{const path=new URL(String(u),'https://local.qa').pathname;window.__qaRequests.push(path);let v=values[path];if(!v){if(/platform/.test(path))v={prefs:{},modules:{}};else if(/alerts|journal|watchlist/.test(path))v={items:[],entries:[],alerts:[],unreadCount:0};else if(/pulse/.test(path))v={badges:{}};else if(/activity/.test(path))v={items:[{id:'qa-activity',symbol:'QA',actor:'QA example institution',side:'buy',amountUsd:50000,shares:100,price:50,note:'Controlled source context for responsive verification, not actual trading data.',timestamp:'2026-10-02T04:00:00Z',amountCrypto:2,from:'QA wallet',to:'QA exchange',venue:'QA'}],total:1};else if(/portfolio/.test(path))v={holdings:[{symbol:/crypto/.test(path)?'BTC':'NVDA',shares:2,amount:2,avg_cost:50}],books:[]};else if(/positions/.test(path))v={positions:[{id:'qa-position',market:'QA long event question for responsive layout testing',pick:'Yes',category:'Sports',stake:0,yes_price:57,status:'open',created_at:'2026-10-02T04:00:00Z'}]};else if(/bets/.test(path))v={bets:[{id:'qa-bet',matchup:'Chicago Blackhawks @ Utah Mammoth',pick:'Utah',odds:'-114',sportsbook:'QA book',sport:'icehockey_nhl',stake:0,status:'open',created_at:'2026-10-02T04:00:00Z'}]};else if(/news/.test(path))v={items:[{id:'qa-news',headline:'QA: A long headline tests wrapping in the market news and events panel',summary:'Controlled test content, not a real news report. '.repeat(5),source:'QA',category:'market',impact:'medium',publishedAt:'2026-10-02T04:00:00Z',tags:['QA']}]};}return Response.json(v??{error:'QA unavailable fixture'},{status:v?200:503});};}"""
SELECTORS = '.terminal-main,.v2-home,.v2-pro-legacy,.phase2-intel,.institutional-panel,.market-workspace-content,.grid-2,.phase2-card,.or-board,.market-workspace-hero,.card,.activity-panel,.mf-stat-row,.mf-item-card,.chief-panel,.glossary-modal'
CHECK = """(selectors)=>{const v=document.documentElement.clientWidth;return [...document.querySelectorAll(selectors)].flatMap(e=>{const r=e.getBoundingClientRect();if(!r.width)return [];return r.right>v+2||r.left< -2||r.width>v+2||e.scrollWidth>e.clientWidth+2?[{class:e.className,right:Math.round(r.right),left:Math.round(r.left),width:Math.round(r.width),client:e.clientWidth,scroll:e.scrollWidth}]:[]})}"""
TABS = ['home', 'stocks', 'crypto', 'penny', 'betting', 'predictions']
TAB_TITLES = dict(stocks='Stocks', crypto='Crypto', penny='Pink Sheets', betting='Sports', predictions='Predictions')
CSS = next((DIST / 'assets').glob('*.css')).read_text()
JS = next((DIST / 'assets').glob('*.js')).read_text()
LOGO = 'data:image/png;base64,' + base64.b64encode((DIST / 'brand/motivefx-logo.png').read_bytes()).decode()


def render(browser, width, mode):
    ctx = browser.new_context(viewport={'width':width, 'height':960}, is_mobile=width<900, has_touch=True, reduced_motion='reduce')
    ctx.route('**/*', lambda route: route.abort())
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + CSS + '</style></head><body><div id="root"></div></body></html>')
    page.evaluate(STORAGE)
    page.evaluate(INIT + (f"window.__MOTIVEFX_NATIVE_PLATFORM__='{mode}';" if mode != 'web' else ''))
    page.evaluate(FETCH, RESP)
    page.add_script_tag(type='module', content=JS)
    page.wait_for_selector('.or-board', timeout=5000)
    page.wait_for_timeout(180)
    page.evaluate('(url)=>document.querySelectorAll("img[src*=motivefx-logo]").forEach(img=>img.src=url)', LOGO)
    return ctx, page, errors


def navigate(page, tab):
    if tab == 'home':
        page.locator('.mobile-header-tool,.sidebar-item').filter(has_text='Home').first.evaluate('(e)=>e.click()')
    else:
        page.locator('.mobile-bottom-nav button').nth(['stocks','crypto','betting','penny','predictions'].index(tab)).evaluate('(e)=>e.click()')
    page.wait_for_timeout(180)
    if tab != 'home':
        assert page.locator('.market-workspace h1').inner_text() == TAB_TITLES[tab]


def bounds(page, context):
    bad = page.evaluate(CHECK, SELECTORS)
    assert not bad, f'{context}: clipped/overflowed content {bad}'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cases = []
    interaction_cases = []
    with sync_playwright() as p:
        options = dict(headless=True, args=['--no-sandbox'])
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**options)
        for mode in ['web','android','ios']:
            for width in [320,390,600,768,1024,1440]:
                ctx, page, errors = render(browser, width, mode)
                for tab in TABS:
                    if tab != 'home':
                        navigate(page, tab)
                    for theme in ['light','dark']:
                        current = page.evaluate('document.documentElement.dataset.colorTheme')
                        if current != theme:
                            page.locator('.theme-toggle').evaluate('(e)=>e.click()')
                        assert page.evaluate('document.documentElement.dataset.colorTheme') == theme
                        case = dict(mode=mode, width=width, tab=tab, theme=theme)
                        bounds(page, case)
                        assert not errors, errors
                        cases.append(case)
                ctx.close()
        for mode in ['web','android','ios']:
            for width in [320,390,768,1024]:
                ctx, page, errors = render(browser, width, mode)
                for font_size in [16,20]:
                    page.add_style_tag(content=f'html{{font-size:{font_size}px}}')
                    case = dict(mode=mode, width=width, fontSize=font_size)
                    for resized in [width,854,width]:
                        page.set_viewport_size({'width':resized, 'height':960})
                        page.wait_for_timeout(100)
                        bounds(page, {**case,'resized':resized})
                    assert page.locator('.or-stat').count() == 5
                    page.locator('.or-carousel').evaluate('(e)=>e.scrollLeft=e.scrollWidth')
                    page.wait_for_timeout(80)
                    bounds(page, case)
                    page.locator('.or-view-toggle button').filter(has_text='List').evaluate('(e)=>e.click()')
                    assert page.locator('.or-list-hit').count() == len(BRIEF['probabilityViews'])
                    bounds(page, case)
                    page.locator('.or-view-toggle button').filter(has_text='Cards').evaluate('(e)=>e.click()')
                    page.locator('.or-how-btn').evaluate('(e)=>e.click()')
                    assert page.locator('.or-how-panel').is_visible()
                    bounds(page, case)
                    page.locator('.or-how-btn').evaluate('(e)=>e.click()')
                    labels = page.evaluate("""()=>{const p=document.querySelector('.signal-graph-panel').getBoundingClientRect();return [...document.querySelectorAll('.signal-graph-sat-labels li')].filter(e=>{const r=e.getBoundingClientRect();return r.left<p.left||r.right>p.right}).map(e=>e.textContent)}""")
                    assert not labels, {**case,'clippedLabels':labels}
                    page.locator('.chief-fab').evaluate('(e)=>e.click()')
                    page.wait_for_timeout(300)
                    page.locator('.chief-panel').evaluate('(e)=>e.getAnimations().forEach(a=>a.finish())')
                    bounds(page, case)
                    page.locator('.chief-close').evaluate('(e)=>e.click()')
                    page.locator('.mobile-header-tool').filter(has_text='Signal').evaluate('(e)=>e.click()')
                    assert page.locator('.glossary-modal').is_visible()
                    page.wait_for_timeout(100)
                    bounds(page, case)
                    page.locator('.glossary-modal .btn-icon').first.evaluate('(e)=>e.click()')
                    assert not errors, errors
                    interaction_cases.append(case)
                ctx.close()
        for mode, width in [('android',390), ('web',1440)]:
            ctx, page, errors = render(browser, width, mode)
            for selector, name in [('.or-board','radar'), ('.signal-graph-panel','signal-graph'), ('.phase2-intel','intelligence')]:
                page.locator(selector).screenshot(path=str(OUT / f'{name}-{mode}-{width}.png'))
            ctx.close()
        browser.close()
    (OUT / 'report.json').write_text(json.dumps({'layoutCases':cases,'interactionCases':interaction_cases,'testData':'Controlled API fixtures, not a production session'}, indent=2))
    print(f'PASS: {len(cases)} populated layout cases and {len(interaction_cases)} resize/large-text/control scenarios; no clipped content containers or JS page errors.')


if __name__ == '__main__':
    main()
