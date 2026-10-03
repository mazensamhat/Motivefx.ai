import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL("../"+p,import.meta.url),"utf8");
const [home,side,trust,setup,server,vercel]=await Promise.all([
 read("web/src/components/MotiveV2Home.tsx"),read("web/src/components/ModuleSidebar.tsx"),
 read("web/src/components/MotiveV2TrustLayer.tsx"),read("web/src/components/PlatformSetupModal.tsx"),
 read("apps/site/src/lib/terminal/engines/predictive.ts"),read("apps/site/vercel.json")
]);
test("all finish-line V2 surfaces are mounted",()=>{
 for(const name of ["MotiveDiscover","MotivePortfolioIntelligence","MotiveMarketClose","MotiveTrackRecord","MotiveWatchAgents"])assert.match(home,new RegExp(name));
 assert.match(home,/id="v2-pro-intelligence"/);
});
test("workspace exposes finish-line destinations",()=>{
 for(const label of ["Discover / Scanner","Portfolio Intelligence","Market Close","Track Record & Replay","Watch Agents","Pro Intelligence"])assert.match(side,new RegExp(label.replace("/","\\/")));
});
test("pro callbacks restore structured deep-intelligence drilldowns",()=>{
 assert.match(home,/onInspectTheme/);assert.match(home,/onInspectGraphLink/);assert.match(home,/resolveSignalDetail/);
});
test("watch agents include persistent custom signal rules and background cron",()=>{
 for(const kind of ["signal_above","signal_below","signal_change"])assert.match(server,new RegExp(kind));
 const cfg=JSON.parse(vercel);assert.ok(cfg.crons.some(c=>c.path==="/api/cron/watch-agents"));
});
test("external app setup truthfully describes handoffs, not synchronization",()=>{
 assert.match(setup,/handoff preferences only/i);assert.match(setup,/does not sync balances, holdings, transactions, or broker credentials/i);
});
test("Simple to Pro is explicit and recoverable from sidebar",()=>{
 assert.match(home,/Show Pro/);assert.match(side,/motivefx:pro-open/);
});
