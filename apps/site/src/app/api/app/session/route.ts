import { json, unauthorized } from "@/lib/api";
import { syncBackendUser } from "@/lib/backend";
import { getSession } from "@/lib/session";

/** Bridge Next.js site login → FastAPI tokens for the embedded terminal. */
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const backend = await syncBackendUser(session.email);
  if (!backend) {
    return json(
      {
        ok: false,
        error: "backend_unavailable",
        message: "FastAPI backend is not reachable. Check MOTIVEFX_API_URL and BACKEND_SYNC_SECRET.",
      },
      503
    );
  }

  return json({
    ok: true,
    userId: backend.userId,
    email: backend.email,
    accessToken: backend.accessToken,
    refreshToken: backend.refreshToken,
  });
}
