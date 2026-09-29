import { prisma } from "@motivefx/database";

export const metadata={title:"Health & Security — MotiveFX Ops",robots:{index:false,follow:false}};

type Run={id:string;cadence:string;period_start:string;period_end:string;checked_at:string;status:string;issue_count:number;open_count:number;fixed_count:number;summary:string;details:any[];deployment_id:string|null;deployment_state:string|null};

async function runs():Promise<Run[]>{
  try {
    const rows=await prisma.$queryRawUnsafe<any[]>(`SELECT id,cadence,period_start,period_end,checked_at,status,issue_count,open_count,fixed_count,summary,details,deployment_id,deployment_state FROM public."OpsProductionWatchRun" WHERE product_key='motivefx' ORDER BY checked_at DESC LIMIT 250`);
    return rows as Run[];
  } catch(error) {
    console.error("[health-audits]",error);
    return [];
  }
}
const stamp=(v:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
export default async function HealthAuditsPage(){
 const all=await runs(); const cadences=["hourly","daily","weekly","monthly"];
 return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform</p><h1 className="text-2xl font-semibold">Production Health & Security</h1><p className="mt-1 text-sm text-slate-500">Automated MotiveFX checks, findings, remediation and pass/fail verification.</p></div>
 <div className="flex flex-wrap gap-2">{cadences.map(c=><a key={c} href={"#"+c} className="rounded-lg border px-3 py-2 text-sm font-medium">{c[0].toUpperCase()+c.slice(1)} ({all.filter(r=>r.cadence===c).length})</a>)}</div>
 {cadences.map(c=><section id={c} key={c} className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">{c[0].toUpperCase()+c.slice(1)} checks</h2></div><div className="divide-y">{all.filter(r=>r.cadence===c).map(r=><details key={r.id} className="px-5 py-4"><summary className="cursor-pointer"><div className="grid gap-2 md:grid-cols-[170px_100px_90px_90px_1fr]"><span>{stamp(r.period_end)}</span><strong>{r.status}</strong><span>{r.issue_count} issues</span><span>{r.open_count} open</span><span>{r.summary}</span></div></summary><div className="mt-4 space-y-3 bg-slate-50 p-4">{(r.details||[]).length?(r.details||[]).map((d:any,i:number)=><div key={i} className="rounded-lg border bg-white p-3"><strong>{d.title||"Finding"}</strong><p className="text-sm">Diagnosis: {d.diagnosis||"—"}</p><p className="text-sm">Fix/action: {d.resolution||"No action required"}</p><p className="text-sm">Verification: {d.evidence||"—"}</p><p className="text-sm font-semibold">{d.fixed===true?"PASS":d.fixed===false?"FAILED / OPEN":"MONITORING"}</p></div>):<p className="text-sm">No incidents in this period.</p>}</div></details>)}{!all.some(r=>r.cadence===c)&&<p className="px-5 py-6 text-sm text-slate-500">No recorded {c} run yet.</p>}</div></section>)}</div>
}