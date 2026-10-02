import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../web/package.json',import.meta.url));
const ts=require('typescript');
const source=readFileSync(new URL('../web/src/utils/positionCategories.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {sportCategory,predictionCategory,positionCategoryLabel}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
for(const raw of ['NHL','nhl','icehockey_nhl','Hockey','ice hockey']) test(`${raw} is Hockey, never Football`,()=>{assert.equal(sportCategory(raw),'hockey');assert.notEqual(sportCategory(raw),'football');});
for(const [raw,category] of [['NFL','football'],['americanfootball_nfl','football'],['NBA','basketball'],['WNBA','basketball'],['MLB','baseball'],['soccer_epl','soccer'],['UFC','mma'],['tennis_atp','tennis']]) test(`${raw} mapping`,()=>assert.equal(sportCategory(raw),category));
for(const raw of ['',null,undefined,'unclassified']) test(`unknown sport ${raw} is not invented`,()=>assert.equal(sportCategory(raw),'other'));
for(const [raw,category] of [['sports','sports'],['Sports & Predictions','sports'],['Politics & Elections','politics'],['Geopolitics & War','geopolitics'],['Economy & Fed','economy'],['Celebrity & Culture','entertainment'],['Crypto Events','crypto'],['Science & Tech','science'],['signal','other']]) test(`prediction ${raw}`,()=>assert.equal(predictionCategory(raw),category));
test('saved NHL entry stays in hockey while manual form can remain unselected',()=>{
 const saved=[{sport:'NHL',matchup:'Flyers @ Devils'},{sport:'NFL',matchup:'Bills @ Chiefs'}];
 assert.equal(saved.filter(r=>sportCategory(r.sport)==='hockey').length,1);
 assert.equal(saved[0].sport,'NHL');assert.equal(positionCategoryLabel('betting','NHL'),'Hockey');
});
test('prediction sports is present and label is explicit',()=>assert.equal(positionCategoryLabel('predictions','sports'),'Sports'));
