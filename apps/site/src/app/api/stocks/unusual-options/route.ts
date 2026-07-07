import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { scanUnusualOptions, fetchCongressTrades } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "trades");
    return json({ items: scanUnusualOptions() });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
