import { json } from "@/lib/api";
import { fetchLineMoves } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") ?? "americanfootball_nfl";
  return json({ items: await fetchLineMoves(sport) });
}
