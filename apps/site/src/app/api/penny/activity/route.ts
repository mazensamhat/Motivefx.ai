import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { scanPennyMovers } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "penny");
    const items = scanPennyMovers();
    return json({ items, count: items.length });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
