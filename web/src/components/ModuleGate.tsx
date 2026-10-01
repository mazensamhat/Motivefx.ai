import { Lock } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { AgeGateModal, isAgeVerified } from "./AgeGateModal";
import { MarketWorkspace } from "./MarketWorkspace";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { getUserId } from "../lib/api";
import { isNativeIapAvailable, isNativeIosShell, isNativeShell, requestNativeIapPurchase, syncNativeShellDocumentClass } from "../lib/nativeShell";
interface Props { module: string; moduleLabel: string; children: ReactNode; }
const AGE_GATED = new Set(["betting", "predictions"]);
const MODULE_DEFAULT_TIER: Record<string, string> = { trades: "lite", crypto: "lite", penny: "lite", betting: "lite", predictions: "lite" };
function isIosFreeReaderShell(): boolean { return isNativeIosShell(); }
export function ModuleGate({ module, moduleLabel, children }: Props) {
  const { isAuthenticated, openAuth } = useAuth();
  const { hasModule, loading, subscribeModule, simulation } = useModules();
  const [ageOk, setAgeOk] = useState(() => isAgeVerified() || !AGE_GATED.has(module) || isIosFreeReaderShell());
  const [nativeIap, setNativeIap] = useState(false);
  const native = isNativeShell();
  const iosReader = isIosFreeReaderShell();
  const simEligible = AGE_GATED.has(module);
  const simExpired = !iosReader && simEligible && isAuthenticated && simulation && !simulation.active;
  useEffect(() => { syncNativeShellDocumentClass(); setNativeIap(isNativeIapAvailable()); }, []);
  if (loading) return <div className="loading" style={{ padding: "3rem" }}>{iosReader ? "Loading…" : "Checking subscription…"}</div>;
  if (AGE_GATED.has(module) && !ageOk) return <AgeGateModal moduleLabel={moduleLabel} onVerified={() => setAgeOk(true)} />;
  // Existing entitlement and native-reader behavior is preserved. Only the presentation wrapper is new.
  if (iosReader || hasModule(module)) return <MarketWorkspace module={module}>{children}</MarketWorkspace>;
  function onUnlock() {
    if (native && nativeIap) { requestNativeIapPurchase(MODULE_DEFAULT_TIER[module] ?? "lite", getUserId()); return; }
    if (native) return;
    if (!isAuthenticated && simEligible) { openAuth("register"); return; }
    subscribeModule(module);
  }
  return <div className="module-gate">
    <div className="module-gate-preview"><MarketWorkspace module={module}>{children}</MarketWorkspace></div>
    <div className="module-gate-overlay"><Lock size={32} />
      <h3>{native && !nativeIap ? `${moduleLabel} — preview` : `Unlock ${moduleLabel}`}</h3>
      {native && nativeIap ? <p>Subscribe with in-app store billing to unlock this market. Plans start at Lite ($29.99/mo).</p> : native ? <p>New purchases are not offered in this app build. Sign in with an account that already includes this market, or use free / demo content available here.</p> : <p>AI market intelligence, live scoops, and GPT-powered signal research — $29/mo with 3-day free trial.</p>}
      {simEligible && !isAuthenticated && !native && <p className="module-gate-sim-hint">Create a free account to get 3 days of simulation on betting &amp; predictions — no card required.</p>}
      {simExpired && <p className="module-gate-sim-hint">Your simulation period has ended. {native && !nativeIap ? "In-app store billing is not configured in this build yet." : native && nativeIap ? "Subscribe in the app to keep live signals." : "Subscribe to keep tracking live signals and AI research."}</p>}
      {!(native && !nativeIap) && <button className="btn btn-primary" onClick={onUnlock}>{native && nativeIap ? "Subscribe in app" : !isAuthenticated && simEligible ? "Create free account" : "Start free trial"}</button>}
    </div>
  </div>;
}
