import { json } from "@/lib/api";
import { catalogForApi } from "@/lib/terminal/trading-platforms";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(catalogForApi());
}
