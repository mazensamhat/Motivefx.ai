"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type ImpersonationState = {
  active: {
    effectiveUserId: string;
    mode: string;
    reason: string;
    expiresAt: string;
  } | null;
  effectiveUserEmail: string | null;
};

export function OpsImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/impersonation", { cache: "no-store" });
      if (res.ok) setState((await res.json()) as ImpersonationState);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener("ops:impersonation-changed", onChange);
    return () => window.removeEventListener("ops:impersonation-changed", onChange);
  }, [load]);

  if (!state?.active) return null;

  async function exitSession() {
    await fetch("/api/admin/impersonation", { method: "DELETE" });
    window.dispatchEvent(new Event("ops:impersonation-changed"));
    await load();
  }

  return (
    <div className="ops-impersonation-banner" role="status">
      <AlertTriangle className="h-4 w-4" />
      <strong>IMPERSONATING USER</strong>
      <span>{state.effectiveUserEmail ?? state.active.effectiveUserId}</span>
      <span className="ops-muted">Mode {state.active.mode}</span>
      <button type="button" className="ops-toolbar-btn" onClick={() => void exitSession()}>
        EXIT SESSION
      </button>
    </div>
  );
}
