"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { SignupMap, type SignupMapData } from "@/components/admin/signup-map";
import { SiteUsersPanel } from "@/components/admin/site-users-panel";

const emptySignupMap: SignupMapData = {
  totalUsers: 0,
  locatedUsers: 0,
  points: [],
  filters: { continents: [], countries: [], regions: [], cities: [] },
};

export function OpsUsers() {
  const [signupMap, setSignupMap] = useState<SignupMapData>(emptySignupMap);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-dashboard", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as { totalUsers?: number; signupMap?: SignupMapData };
      setTotalUsers(data.totalUsers ?? 0);
      setSignupMap({ ...emptySignupMap, ...data.signupMap });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load site users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Users</h2>
            <p>Site accounts, grants, Stripe linkage · signup geography</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}

      <div className="admin-kpi-grid ops-kpi-grid">
        <div className="admin-kpi app-panel">
          <span className="admin-kpi-label">Total users</span>
          <strong>{totalUsers}</strong>
        </div>
        <div className="admin-kpi app-panel">
          <span className="admin-kpi-label">Located on map</span>
          <strong>{signupMap.locatedUsers}</strong>
        </div>
      </div>

      <SiteUsersPanel />
      {signupMap.points.length > 0 ? <SignupMap data={signupMap} /> : null}
    </section>
  );
}
