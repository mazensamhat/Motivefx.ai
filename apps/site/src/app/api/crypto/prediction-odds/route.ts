import { json } from "@/lib/api";
import { fetchPredictionMarkets } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ items: await fetchPredictionMarkets(10) });
}
