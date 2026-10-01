"""Browser CSS regression tests with actual stylesheet and isolated component markup.
These do not claim authenticated end-to-end coverage of the entire app.
"""
from pathlib import Path
import os, json, re
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
legacy = (ROOT / 'web/src/styles/global.css').read_text()
patch = (ROOT / 'web/src/styles/day-surfaces.css').read_text()
fixture = '''<main class="app app-terminal" data-theme="crypto">
<section class="or-board terminal-or">
<h2 class="or-title">Opportunity Radar · QA fixture</h2>
<div class="or-stat"><span>Average signal score</span><strong>66</strong></div>
<ul class="or-legend"><li>Moderate evidence</li></ul>
<article class="or-card band-moderate"><div class="or-card-identity"><h3>Example signal</h3></div>
<div class="or-gauge"><strong>74</strong></div><p class="or-desc">Evidence, not a forecast probability.</p>
<div class="or-meta-grid"><ul><li>Source detail</li></ul></div>
<footer class="or-card-foot"><strong>Review evidence</strong></footer></article>
<div class="or-how-panel">How it works</div><button class="or-nav">Next</button>
</section>
<section class="card"><header class="card-header"><h2 class="card-title">News and Events</h2></header><div class="card-body"><p class="loading">Loading state</p></div></section>
<section class="activity-skeleton-card"><div class="activity-skeleton-line"> </div></section>
<section class="glossary-modal glass-panel"><article class="glossary-card">Glossary dialog</article></section>
</main>
<aside class="chief-panel glass-panel"><h2>Ask Motive · body portal</h2><p class="chief-sub">Context preserved</p><div class="chief-bubble chief-bubble-assistant"><p>Example assistant response.</p></div><button class="chief-chip">Suggested question</button><form class="chief-composer"><input placeholder="Message" value="Explain this signal"></form></aside>'''
checks = [('.or-stat','.or-stat span'),('.or-legend','.or-legend li'),('.or-card','.or-desc'),('.or-card','.or-gauge strong'),('.or-how-panel','.or-how-panel'),('.or-nav','.or-nav'),('.card','.card-title'),('.card-body','.loading'),('.glossary-card','.glossary-card'),('.chief-panel','.chief-sub'),('.chief-bubble-assistant','.chief-bubble-assistant'),('.chief-chip','.chief-chip'),('.chief-composer input','.chief-composer input')]
layout = '''*{transition:none!important;animation:none!important}body{margin:0;padding:20px;font:16px/1.5 Arial}main{display:block!important}.or-board{padding:16px}.or-stat,.or-legend,.or-card,.card,.glossary-modal,.chief-panel{padding:16px!important;margin:12px 0!important;border:1px solid #ddd;border-radius:10px} .or-card{min-height:120px}.or-gauge strong{position:static!important}.glossary-modal,.chief-panel{position:static!important;width:auto!important;height:auto!important;max-height:none!important;animation:none!important}.chief-panel{display:block!important}.activity-skeleton-card{height:60px;padding:16px}.activity-skeleton-line{height:16px;width:80%}.or-nav{position:static!important;display:block!important}'''
def rgba(s):
    nums=[float(n) for n in re.findall(r'[\d.]+',s)]
    return nums[:3]+[nums[3] if len(nums)>3 else 1]
def lum(rgb):
    vals=[v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4 for v in rgb[:3]]
    return .2126*vals[0]+.7152*vals[1]+.0722*vals[2]
results=[]
with sync_playwright() as p:
    kwargs={'headless':True,'args':['--no-sandbox']}
    if os.getenv('CHROMIUM_PATH'): kwargs['executable_path']=os.environ['CHROMIUM_PATH']
    browser=p.chromium.launch(**kwargs)
    for width in [390,1440]:
        page=browser.new_page(viewport={'width':width,'height':1000})
        page.set_content(f'<html data-color-theme="dark"><head><style>{legacy}</style><style>{layout}</style></head><body>{fixture}</body></html>')
        def capture():
            return page.evaluate('''(pairs)=>pairs.map(([a,b])=>({surface:a,text:b,bg:getComputedStyle(document.querySelector(a)).backgroundColor,fg:getComputedStyle(document.querySelector(b)).color}))''',checks)
        before=capture()
        page.add_style_tag(content=patch)
        after=capture()
        assert before==after, f'Night colors changed at {width}px'
        page.evaluate('document.documentElement.dataset.colorTheme="light"')
        for module in ['home','trades','penny','crypto','betting','predictions']:
            page.evaluate('(v)=>document.querySelector(".app").dataset.theme=v',module)
            for row in capture():
                bg,fg=rgba(row['bg']),rgba(row['fg'])
                assert bg[3]>.99 and lum(bg)>.7, f'Dark/translucent Day surface {module}/{width}: {row}'
                ratio=(max(lum(bg),lum(fg))+.05)/(min(lum(bg),lum(fg))+.05)
                assert ratio>=4.5, f'Low contrast {module}/{width}: {row}, ratio={ratio}'
                results.append({'width':width,'module':module,**row,'contrast':round(ratio,2)})
        out=ROOT/'test-results';out.mkdir(exist_ok=True)
        page.screenshot(path=str(out/f'day-component-fixture-{width}.png'),full_page=True)
        page.close()
    browser.close()
(ROOT/'test-results/theme-results.json').write_text(json.dumps(results,indent=2))
print(f'PASS: {len(results)} Day contrast checks; Night colors unchanged in both viewport fixtures.')
