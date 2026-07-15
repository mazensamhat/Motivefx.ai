import { Lock } from "lucide-react";
import { ReactNode, useState } from "react";
import { AgeGateModal, isAgeVerified } from "./AgeGateModal";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { isNativeShell, openExternalSubscribe } from "../lib/nativeShell";

interface Props {
  module: string;
  moduleLabel: string;
  children: ReactNode;
}

const AGE_GATED = new Set(["betting", "predictions"]);

export function ModuleGate({ module, moduleLabel, children }: Props) {
  const { isAuthenticated, openAuth } = useAuth();
  const { hasModule, loading, subscribeModule, simulation } = useModules();
  const [ageOk, setAgeOk] = useState(() => isAgeVerified() || !AGE_GATED.has(module));
  const native = isNativeShell();
  const simEligible = AGE_GATED.has(module);
  const simExpired = simEligible && isAuthenticated && simulation && !simulation.active;

  if (loading) {
    return <div className="loading" style={{ padding: "3rem" }}>Checking subscription…</div>;
  }

  if (AGE_GATED.has(module) && !ageOk) {
    return <AgeGateModal moduleLabel={moduleLabel} onVerified={() => setAgeOk(true)} />;
  }

  if (hasModule(module)) {
    return <>{children}</>;
  }

  return (
    <div className="module-gate">
      <div className="module-gate-preview">{children}</div>
      <div className="module-gate-overlay">
        <Lock size={32} />
        <h3>{native ? `${moduleLabel} — companion preview` : `Unlock ${moduleLabel}`}</h3>
        {native ? (
          <p>
            This iOS app is an account companion. Subscriptions are purchased on the website (Safari),
            not inside the app. Sign in with a subscribed account to access paid markets, or continue
            with free / demo content here.
          </p>
        ) : (
          <p>
            AI market intelligence, live scoops, and GPT-powered signal research — $29/mo with 3-day free
            trial.
          </p>
        )}
        {simEligible && !isAuthenticated && !native && (
          <p className="module-gate-sim-hint">
            Create a free account to get 3 days of simulation on betting &amp; predictions — no card required.
          </p>
        )}
        {simExpired && (
          <p className="module-gate-sim-hint">
            Your simulation period has ended.{" "}
            {native
              ? "Manage your subscription on the website in Safari."
              : "Subscribe to keep tracking live signals and AI research."}
          </p>
        )}
        <button
          className="btn btn-primary"
          onClick={() => {
            if (native) {
              openExternalSubscribe();
              return;
            }
            if (!isAuthenticated && simEligible) {
              openAuth("register");
              return;
            }
            subscribeModule(module);
          }}
        >
          {native
            ? "Manage subscription on website"
            : !isAuthenticated && simEligible
              ? "Create free account"
              : "Start free trial"}
        </button>
      </div>
    </div>
  );
}
