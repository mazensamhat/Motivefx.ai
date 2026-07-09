import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { filterCryptoActivity, parseActivityQuery } from "@/lib/terminal/activity-feeds";
import { fetchCryptoActivity } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "crypto");
    const query = parseActivityQuery(request);
    const items = filterCryptoActivity(await fetchCryptoActivity(), query);
    return json({ items, count: items.length });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
