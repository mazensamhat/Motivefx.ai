import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { filterStockActivity, parseActivityQuery } from "@/lib/terminal/activity-feeds";
import { fetchStockActivity } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "trades");
    const query = parseActivityQuery(request);
    const items = filterStockActivity(await fetchStockActivity(), query);
    return json({ items, count: items.length });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
