import { redirect } from "next/navigation";

import { marketBySlug } from "@/lib/entitlements";



const SLUG_TO_TAB: Record<string, string> = {

  stocks: "stocks",

  crypto: "crypto",

  "pink-slips": "penny",

  sports: "betting",

  predictions: "predictions",

  options: "stocks",

};



export default async function AppMarketPage({ params }: { params: Promise<{ slug: string }> }) {

  const { slug } = await params;

  const market = marketBySlug(slug);

  if (!market) redirect("/terminal");



  const tab = SLUG_TO_TAB[market.slug] ?? "home";

  redirect(`/terminal?tab=${tab}`);

}

