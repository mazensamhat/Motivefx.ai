import { Clock, FlaskConical, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useModules } from "../hooks/useModules";
import { getUserId } from "../lib/api";
import {
  isNativeAndroidShell,
  isNativeIapAvailable,
  isNativeIosShell,
  isNativeShell,
  requestNativeIapPurchase,
} from "../lib/nativeShell";

interface Props {
  module: "betting" | "predictions";
}

export function SimulationBanner({ module }: Props) {
  const { isSimulationOnly, simulation, subscribeModule } = useModules();
  const native = isNativeShell();
  const androidPlaySafe = isNativeAndroidShell();
  const [nativeIap, setNativeIap] = useState(false);

  useEffect(() => {
    setNativeIap(isNativeIapAvailable());
  }, []);

  if (!isSimulationOnly(module) || !simulation?.active) {
    return null;
  }

  const daysLeft = simulation.daysRemaining ?? 0;
  const bankroll = simulation.bankroll ?? 1000;
  const label = androidPlaySafe
    ? module === "betting"
      ? "Odds intel"
      : "Event intel"
    : module === "betting"
      ? "Sports betting"
      : "Prediction markets";

  return (
    <div className="simulation-banner">
      <div className="simulation-banner-main">
        <FlaskConical size={20} className="simulation-banner-icon" />
        <div>
          <div className="simulation-banner-title">
            {label} · Simulation mode
          </div>
          <p className="simulation-banner-copy">
            {androidPlaySafe
              ? "Research-only monitor mode for Android. No wagers, venue handoffs, or bet placement workflows."
              : "Enter picks with virtual money — outcomes settle instantly so you can see how MotiveFX tracks and grades your edge. No real wagers."}
          </p>
        </div>
      </div>
      <div className="simulation-banner-stats">
        <div className="simulation-stat">
          <span className="simulation-stat-label">Virtual bankroll</span>
          <span className="simulation-stat-value">
            <TrendingUp size={14} />
            ${bankroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="simulation-stat">
          <span className="simulation-stat-label">Sim time left</span>
          <span className="simulation-stat-value">
            <Clock size={14} />
            {daysLeft >= 1 ? `${Math.ceil(daysLeft)}d` : `${Math.max(1, Math.ceil(daysLeft * 24))}h`}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm simulation-banner-cta"
          onClick={() => {
            if (isNativeIosShell()) return;
            if (native && nativeIap) {
              requestNativeIapPurchase("lite", getUserId());
              return;
            }
            if (native) {
              // No web steering from the native shell.
              return;
            }
            subscribeModule(module);
          }}
          disabled={(native && !nativeIap) || isNativeIosShell()}
          style={isNativeIosShell() ? { display: "none" } : undefined}
        >
          {native && nativeIap
            ? "Subscribe in app"
            : native
              ? "Store billing unavailable"
              : "Upgrade to live module"}
        </button>
      </div>
    </div>
  );
}
