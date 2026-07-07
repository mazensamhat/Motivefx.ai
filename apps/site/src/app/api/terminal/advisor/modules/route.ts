import { json } from "@/lib/api";
import { MODULE_CATALOG, BUNDLE_PRICE_USD } from "@/lib/terminal/modules-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ modules: MODULE_CATALOG, bundlePrice: BUNDLE_PRICE_USD });
}
