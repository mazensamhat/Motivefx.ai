import { json } from "@/lib/api";
import { PREDICTION_CATEGORIES, fetchPredictionMarkets } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ items: PREDICTION_CATEGORIES });
}
