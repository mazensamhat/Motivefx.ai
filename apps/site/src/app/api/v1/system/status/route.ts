import { buildPublicStatusSnapshot } from "@/lib/public-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await buildPublicStatusSnapshot();
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
