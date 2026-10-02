import { Lock } from "lucide-react";
import { ReactNode } from "react";
import { EntitlementFeature, featureLabel, requiredTierLabel } from "../lib/entitlements";
import { useModules } from "../hooks/useModules";
import { useAuth } from "../hooks/useAuth";
import { isNativeIosShell } from "../lib/nativeShell";
interface Props { feature: EntitlementFeature; children: ReactNode; compact?: boolean; fallback?: ReactNode; }
export function FeatureGate({ feature, children, compact, fallback }: Props) {
  const { hasFeature, loading, error, refresh, tier } = useModules();
  const { error: authError, refreshUser } = useAuth();
  if (loading) return null;
  if (hasFeature(feature)) return <>{children}</>;
  if (error) return <div className="card" role="alert"><p>{error}</p><button type="button" className="btn" onClick={() => { if (authError) void refreshUser(); else void refresh(); }}>Retry access check</button></div>;
  if (fallback) return <>{fallback}</>;
  if (isNativeIosShell()) return null;
  const label = featureLabel(feature);
  const required = requiredTierLabel(feature);
  if (compact) return <p className="feature-gate-compact"><Lock size={12} /> {label} — upgrade to {required}</p>;
  return <div className="feature-gate glass-card"><Lock size={28} /><h3>{label}</h3><p>Your {tier === "lite" ? "Lite" : tier} plan does not include {label.toLowerCase()}. Upgrade to <strong>{required}</strong> or higher to unlock it.</p></div>;
}
