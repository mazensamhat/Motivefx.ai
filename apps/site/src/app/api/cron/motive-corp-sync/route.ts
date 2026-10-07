import { prisma } from "@motivefx/database";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TARGET = "https://www.motive1crm.com/api/v1/internal/corp-sync";

function authorized(request:Request){
  const secret=process.env.CRON_SECRET?.trim();
  return Boolean(secret)&&request.headers.get("authorization")===`Bearer ${secret}`;
}
function splitName(name:string|null|undefined,email:string){
  const clean=String(name||"").trim();
  const source=clean||email.split("@")[0].replace(/[._+-]+/g," ");
  const parts=source.split(/\s+/).filter(Boolean);
  return {firstName:parts.shift()||"Client",lastName:parts.join(" ")};
}

async function runSync(){
  const secret=process.env.MOTIVE_CORP_SYNC_SECRET?.trim()||"";
  if(secret.length<24)throw new Error("Motive Corp sync secret is not configured");

  const [users,activities,ops]=await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      id:string;email:string;name:string|null;plan:string|null;subscription_status:string|null;
      last_active_at:Date|null;created_at:Date;activity_count:bigint
    }>>(
      `select u.id,u.email,u."displayName" as name,u."intelligenceTier" as plan,
              u."subscriptionStatus" as subscription_status,u."lastSeenAt" as last_active_at,
              u."createdAt" as created_at,
              (select count(*) from public."UsageEvent" e where e."userId"=u.id)::bigint as activity_count
       from public."User" u
       where u."disabledAt" is null
       order by u."createdAt"`
    ),
    prisma.$queryRawUnsafe<Array<{
      id:string;user_id:string;module:string;action:string;endpoint:string|null;status_code:number|null;duration_ms:number|null;created_at:Date
    }>>(
      `select id,"userId" as user_id,module,action,endpoint,"statusCode" as status_code,"durationMs" as duration_ms,"createdAt" as created_at
       from public."UsageEvent"
       where "createdAt">=now()-interval '3 hours'
       order by "createdAt" desc
       limit 1500`
    ),
    prisma.$queryRawUnsafe<Array<{
      id:string;product_key:string|null;cadence:string;checked_at:Date;status:string;issue_count:number;open_count:number;fixed_count:number;
      deployment_id:string|null;deployment_state:string|null;summary:string|null
    }>>(
      `select id,product_key,cadence,checked_at,status,issue_count,open_count,fixed_count,deployment_id,deployment_state,summary
       from public."OpsProductionWatchRun"
       order by checked_at desc
       limit 100`
    ),
  ]);

  const payload={
    productKey:"motivefx",
    sourceProjectRef:"bqewzvkvlgjumhvoxltm",
    clients:users.map(user=>{
      const name=splitName(user.name,user.email);
      return {
        externalId:user.id,email:user.email,firstName:name.firstName,lastName:name.lastName,
        accountStatus:String(user.subscription_status||"").toLowerCase()==="comp"?"active":"lead",
        subscriptionPlan:user.plan,subscriptionStatus:user.subscription_status,
        lastActiveAt:user.last_active_at?.toISOString()??null,activityCount:Number(user.activity_count||0),
        createdAt:user.created_at.toISOString(),
      };
    }),
    activities:activities.map(event=>({
      eventId:event.id,externalUserId:event.user_id,module:event.module,action:event.action,endpoint:event.endpoint,
      statusCode:event.status_code,durationMs:event.duration_ms,occurredAt:event.created_at.toISOString(),
    })),
    ops:ops.map(check=>({
      productKey:String(check.product_key||"motivefx").toLowerCase(),cadence:check.cadence,
      checkedAt:check.checked_at.toISOString(),status:check.status,issueCount:check.issue_count,
      openCount:check.open_count,fixedCount:check.fixed_count,deploymentId:check.deployment_id,
      deploymentState:check.deployment_state,summary:check.summary,
    })),
  };

  const response=await fetch(TARGET,{
    method:"POST",
    headers:{authorization:"Bearer "+secret,"content-type":"application/json",accept:"application/json"},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(45_000),
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(result?.error||"Motive Corp sync failed"));
  return result;
}

export async function GET(request:Request){
  if(!authorized(request))return Response.json({error:"Unauthorized"},{status:401});
  try{
    const result=await runSync();
    return Response.json({ok:true,result,syncedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
  }catch(error:any){
    console.error("[cron/motive-corp-sync]",error);
    return Response.json({ok:false,error:String(error?.message||"Sync failed")},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
