import { json } from "@/lib/api";
import { demoSharpAction } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ items: demoSharpAction() });
}
