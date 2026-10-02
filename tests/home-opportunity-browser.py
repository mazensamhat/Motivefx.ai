"""Exercise actual compiled Home/Radar -> review -> confirm -> existing API boundaries.
Uses controlled API fixtures; never a live login, bookmaker or customer portfolio.
"""
from pathlib import Path
import importlib.util
import json
import os
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('responsive_fixture', ROOT / 'tests/responsive-layout.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
from playwright.sync_api import sync_playwright

SAVES = """() => {
 const original = window.fetch;
 window.__saves=[]; window.__failNext=false;
 window.fetch = async (url,init) => {
  const path=new URL(String(url),'https://qa.local').pathname;
  if(init?.method==='POST' && ['/api/terminal/portfolio/add','/api/advisor/betting/bets','/api/advisor/predictions/positions'].includes(path)) {
   const body=JSON.parse(init.body); window.__saves.push({path,body});
   await new Promise(r=>setTimeout(r,50));
   if(window.__failNext){window.__failNext=false;return Response.json({error:'QA unavailable'},{status:503});}
   return Response.json(path.includes('/terminal/portfolio/add') ? {saved:true,count:2} : {id:'qa-saved-item'});
  }
  return original(url,init);
 };
}"""
CASES=[]
OUT=ROOT/'test-results/home-actions'
OUT.mkdir(parents=True,exist_ok=True)
def capture_failure(page, name):
    # Isolated fixtures contain no customer data or credentials.
    page.screenshot(path=str(OUT/f'failure-{name}.png'))
    (OUT/f'failure-{name}.txt').write_text(page.locator('body').aria_snapshot())
    (OUT/'completed-before-failure.json').write_text(json.dumps(CASES,indent=2))

def check_fit(page, note):
    assert page.locator('.home-research-dialog').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=document.documentElement.clientWidth+1&&e.scrollWidth<=e.clientWidth+1}'), note

def close(page):
    page.get_by_role('button',name='Close research detail',exact=True).click()

def open_add(page, symbol):
    page.locator('#v2-picks').get_by_role('button', name=f'Add {symbol} to portfolio',exact=True).click()
    page.get_by_role('heading',name='Confirm portfolio entry',exact=True).wait_for()

def saved(page):
    page.get_by_text('The server confirmed this portfolio entry. Open the market to review it.',exact=True).wait_for()
    return page.evaluate('window.__saves.at(-1)')

with sync_playwright() as p:
    options=dict(headless=True,args=['--no-sandbox'])
    if os.environ.get('CHROMIUM_PATH'): options['executable_path']=os.environ['CHROMIUM_PATH']
    browser=p.chromium.launch(**options)
    for mode,width,theme in [('web',320,'light'),('web',1440,'dark'),('android',390,'light'),('ios',768,'dark')]:
        ctx,page,errors=r.render(browser,width,mode)
        try:
            if page.evaluate('document.documentElement.dataset.colorTheme')!=theme: page.locator('.theme-toggle').evaluate('(e)=>e.click()')
            page.evaluate(SAVES)
            page.locator('#v2-picks').get_by_role('button',name='See all',exact=True).click()
            assert page.locator('#v2-picks .home-action-card').count()==5
            assert page.locator('#v2-picks button button').count()==0
            assert page.locator('#v2-picks .v2-spark').count()==0
            for symbol,kind in [('NVDA','trades'),('BTC','crypto'),('AMC','penny')]:
                n=page.evaluate('window.__saves.length')
                open_add(page,symbol); check_fit(page,(mode,width,theme,symbol))
                assert page.evaluate('window.__saves.length')==n, 'Opening a dialog must never save'
                page.get_by_role('button',name='Confirm add to portfolio',exact=True).click()
                result=saved(page)
                assert result['body']=={'user_id':'qa','kind':kind,'symbol':symbol},result
                close(page)
                CASES.append([mode,width,theme,'asset',symbol])
            symbol='Chicago Blackhawks @ Utah Mammoth'
            open_add(page,symbol)
            page.get_by_role('combobox',name='Sport',exact=True).select_option('hockey')
            page.get_by_label('Selection',exact=True).fill('Utah +1.5')
            page.get_by_label('Recorded odds (optional)',exact=True).fill('-110')
            page.get_by_label('Sportsbook (optional)',exact=True).fill('QA book')
            page.screenshot(path=str(OUT/f'bet-confirmation-{mode}-{width}-{theme}.png'))
            page.get_by_role('button',name='Confirm add to portfolio',exact=True).click()
            result=saved(page);assert result['body']['sport']=='hockey';assert result['body']['pick']=='Utah +1.5'
            assert result['body']['sportsbook']=='QA book';assert result['body']['stake']==0
            close(page);CASES.append([mode,width,theme,'bet'])
            open_add(page,'Interest-rate decision')
            page.get_by_label('Full market question',exact=True).fill('Will the QA test interest-rate decision occur on the specified date?')
            page.get_by_role('combobox',name='Category',exact=True).select_option('economy')
            page.get_by_role('combobox',name='Selected outcome',exact=True).select_option('No')
            page.get_by_label('Market YES price in cents',exact=True).fill('57')
            page.screenshot(path=str(OUT/f'prediction-confirmation-{mode}-{width}-{theme}.png'))
            page.get_by_role('button',name='Confirm add to portfolio',exact=True).click()
            result=saved(page);assert result['body']['yes_price']==.57;assert result['body']['pick']=='No'
            assert result['body']['category']=='economy';close(page)
            CASES.append([mode,width,theme,'prediction'])
            page.locator('.or-card-hit').first.click()
            page.get_by_role('heading',name='Related items in this briefing',exact=True).wait_for()
            assert page.locator('.home-research-related li').count()==1
            page.locator('.home-research-dialog').get_by_role('button',name='Review NVDA',exact=True).click()
            page.get_by_role('heading',name='NVDA',exact=True).wait_for();check_fit(page,(mode,width,theme,'radar'))
            page.locator('.home-research-dialog').get_by_role('button',name='Ask Motive about this',exact=True).click()
            page.locator('.chief-panel').wait_for()
            assert 'NVDA' in page.locator('.chief-composer input').input_value()
            page.locator('.chief-close').click();CASES.append([mode,width,theme,'radar-to-review-to-ask'])
            open_add(page,'NVDA');page.evaluate('window.__failNext=true')
            page.get_by_role('button',name='Confirm add to portfolio',exact=True).click()
            page.locator('.home-research-dialog [role="alert"]').wait_for()
            assert page.locator('.home-research-dialog').is_visible()
            assert not page.get_by_text('The server confirmed this portfolio entry. Open the market to review it.',exact=True).count()
            page.get_by_role('button',name='Confirm add to portfolio',exact=True).click();saved(page)
            check_fit(page,(mode,width,theme,'retry'))
            page.screenshot(path=str(OUT/f'home-review-{mode}-{width}-{theme}.png'))
            close(page);CASES.append([mode,width,theme,'failed-save-and-retry'])
            assert not errors,errors
        except Exception:
            capture_failure(page,f'{mode}-{width}-{theme}')
            raise
        finally:
            ctx.close()
    # Unsigned user can inspect a source and fill an intent, but cannot submit a mutation.
    old_auth=r.RESP['/api/auth/me'];r.RESP['/api/auth/me']={'user':None}
    ctx,page,errors=r.render(browser,390,'web');page.evaluate(SAVES)
    open_add(page,'NVDA');page.get_by_role('button',name='Sign in to save',exact=True).wait_for()
    assert not page.get_by_role('button',name='Confirm add to portfolio',exact=True).count()
    assert page.evaluate('window.__saves.length')==0;assert not errors,errors
    CASES.append(['web',390,'light','guest-no-write']);ctx.close();r.RESP['/api/auth/me']=old_auth
    browser.close()
(OUT/'report.json').write_text(json.dumps({'cases':CASES,'data':'Controlled API fixtures, not production customer data'},indent=2))
print(f'PASS: {len(CASES)} compiled Home/Radar action scenarios; explicit saves, identity preservation, retry, no guest writes and no clipped dialog content.')
