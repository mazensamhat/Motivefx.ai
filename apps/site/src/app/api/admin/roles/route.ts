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
      role: "full_admin",
      note: "Until multi-role RBAC lands, ADMIN_EMAILS grants the full capability set.",
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
