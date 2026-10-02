import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(await readFile(new URL('../web/src/lib/homeOpportunityActions.ts', import.meta.url), 'utf8'));
const { buildOpportunitySave, EMPTY_SAVE_DRAFT, opportunityKind, opportunityView, reportedScore, relatedOpportunities, saveWasAcknowledged } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const opp = (module, symbol='NVDA', extras={}) => ({id:'qa',module,symbol,title:'QA observed context',confidence:74,riskLevel:'medium',reasons:['QA evidence'],...extras});
const draft = (changes={}) => ({...EMPTY_SAVE_DRAFT,...changes});
for (const [input, expected] of [['stocks','trades'],['trades','trades'],['crypto','crypto'],['penny','penny'],['pinkslips','penny'],['pink_sheets','penny'],['betting','betting'],['sports','betting'],['predictions','predictions']]) {
 test(`known market alias ${input}`,()=>assert.equal(opportunityKind(input),expected));
}
test('unknown market cannot become a stock by default',()=>{assert.equal(opportunityKind('unknown'),null);assert.throws(()=>buildOpportunitySave(opp('unknown'),'qa',draft()),/supported market identity/);});
test('all writes require a verified owner',()=>assert.throws(()=>buildOpportunitySave(opp('stocks'),'',draft()),/Sign in/));
for (const module of ['stocks','crypto','penny']) {
 test(`${module} sends the intended symbol without a bulk replacement payload`,()=>{
  const r=buildOpportunitySave(opp(module,' $btc '),'qa',draft());assert.equal(r.path,'/terminal/portfolio/add');
  assert.deepEqual(r.body,{user_id:'qa',kind:module==='stocks'?'trades':module,symbol:'BTC'});
  assert.ok(!('holdings' in r.body));
 });
}
for (const invalid of ['', 'A full event name', '<script>', 'x'.repeat(26)]) {
 test(`rejects an invalid asset identity ${JSON.stringify(invalid)}`,()=>assert.throws(()=>buildOpportunitySave(opp('stocks',invalid),'qa',draft())));
}
test('sports requires an explicit sport, not a football default',()=>assert.throws(()=>buildOpportunitySave(opp('betting','Leafs @ Bruins'),'qa',draft({pick:'Leafs'})),/Choose the sport/));
test('sports requires selection rather than turning an AI title into a pick',()=>assert.throws(()=>buildOpportunitySave(opp('betting','Leafs @ Bruins'),'qa',draft({sport:'hockey'})),/exact selection/));
test('NHL tracking preserves explicit hockey, selection, odds and book with zero stake',()=>{
 const r=buildOpportunitySave(opp('betting','Leafs @ Bruins'),'qa',draft({sport:'hockey',pick:'Leafs +1.5',odds:'-110',sportsbook:'QA book'}));
 assert.deepEqual(r.body,{user_id:'qa',matchup:'Leafs @ Bruins',pick:'Leafs +1.5',sport:'hockey',stake:0,odds:'-110',sportsbook:'QA book'});
});
test('unknown sportsbook and odds are not fabricated',()=>{
 const r=buildOpportunitySave(opp('betting','Leafs @ Bruins'),'qa',draft({sport:'hockey',pick:'Leafs'}));
 assert.ok(!('odds' in r.body));assert.ok(!('sportsbook' in r.body));
});
for (const [field,message] of [['category','category'],['pick','outcome'],['yesCents','actual YES price']]) {
 test(`prediction requires real ${field}`,()=>assert.throws(()=>buildOpportunitySave(opp('predictions','QA market'),'qa',draft({category:'sports',pick:'No',yesCents:'57',[field]:''})),new RegExp(message)));
}
for (const cents of ['0','0.5','57','100']) {
 test(`prediction quote ${cents} cents is normalized without using the AI signal`,()=>{
 const r=buildOpportunitySave(opp('predictions','QA market',{probability:99,confidence:88}),'qa',draft({category:'sports',pick:'No',yesCents:cents}));
 assert.equal(r.body.yes_price,Number(cents)/100);assert.equal(r.body.pick,'No');assert.equal(r.body.category,'sports');assert.equal(r.body.stake,0);
 });
}
for (const price of ['-1','101','Infinity','NaN',' ']) {
 test(`rejects invalid market price ${JSON.stringify(price)}`,()=>assert.throws(()=>buildOpportunitySave(opp('predictions','QA market'),'qa',draft({category:'sports',pick:'Yes',yesCents:price}))));
}
test('generic item title does not create an unsupported positive recommendation',()=>assert.equal(opportunityView(opp('stocks','NVDA',{title:'An interesting idea'})),'MIXED'));
test('explicit cautious stance wins over a contradictory up direction',()=>assert.equal(opportunityView(opp('stocks','NVDA',{stance:'would_avoid',direction:'up'})),'NEGATIVE'));
test('explicit hold remains mixed',()=>assert.equal(opportunityView(opp('stocks','NVDA',{stance:'would_hold'})),'MIXED'));
test('invalid scores are unavailable, not zero or NaN labels',()=>{for(const score of [null,undefined,NaN,Infinity,-1,101,'80'])assert.equal(reportedScore(score),null);assert.equal(reportedScore(0),0);});
test('related themes match only actual briefing identities without generated substitutes',()=>{
 const rows=[opp('stocks','NVDA'),opp('stocks','NVDA2'),opp('crypto','BTC')];
 assert.deepEqual(relatedOpportunities({relatedSymbols:['nvda']},rows),[rows[0]]);
 assert.deepEqual(relatedOpportunities({relatedSymbols:['missing']},rows),[]);
});
test('success requires the server acknowledgement for that market',()=>{
 assert.equal(saveWasAcknowledged({saved:true},'trades'),true);
 assert.equal(saveWasAcknowledged({id:'saved-bet'},'betting'),true);
 assert.equal(saveWasAcknowledged({id:'saved-prediction'},'predictions'),true);
 for(const r of [null,{}, {error:'failure'}, {saved:false}])assert.equal(saveWasAcknowledged(r,'trades'),false);
 assert.equal(saveWasAcknowledged({saved:true},'predictions'),false);
});
test('prototype names are not market kinds',()=>{for (const kind of ['constructor','__proto__','toString'])assert.equal(opportunityKind(kind),null);});
test('would-not-buy stance never becomes a positive pick',()=>assert.equal(opportunityView(opp('stocks','NVDA',{stance:'wouldnt_buy'})),'NEGATIVE'));
