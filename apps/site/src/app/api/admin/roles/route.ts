import { requireAdminCapability } from "@/lib/admin";
import { forbidden, json, unauthorized } from "@/lib/api";
import {
  CAPABILITY_RISK,
  OPS_CAPABILITIES,
  type OpsCapability,
} from "@/lib/ops/rbac";

export async function GET() {
  const auth = await requireAdminCapability("view_security");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const granted = [...auth.actor.capabilities] as OpsCapability[];
  return json({
    generatedAt: new Date().toISOString(),
    actor: {
      id: auth.actor.id,
      email: auth.actor.email,
      role: auth.actor.role,
      note:
        auth.actor.role === "full_admin"
          ? "Full admin. Set OPS_ROLE_ASSIGNMENTS to scope individual ADMIN_EMAILS users."
          : "Role resolved from OPS_ROLE_ASSIGNMENTS; capability checks are enforced server-side.",
    },
    capabilities: OPS_CAPABILITIES.map((id) => ({
      id,
      risk: CAPABILITY_RISK[id],
      granted: granted.includes(id),
    })),
    grantedCount: granted.length,
    totalCount: OPS_CAPABILITIES.length,
  });
}
