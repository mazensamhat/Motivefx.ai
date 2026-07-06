import { Clock, FlaskConical, TrendingUp } from "lucide-react";
import { useModules } from "../hooks/useModules";

interface Props {
  module: "betting" | "predictions";
}

export function SimulationBanner({ module }: Props) {
  const { isSimulationOnly, simulation, subscribeModule } = useModules();

  if (!isSimulationOnly(module) || !simulation?.active) {
    return null;
  }

  const daysLeft = simulation.daysRemaining ?? 0;
  const bankroll = simulation.bankroll ?? 1000;
  const label = module === "betting" ? "Sports betting" : "Prediction markets";

  return (
    <div className="simulation-banner">
      <div className="simulation-banner-main">
        <FlaskConical size={20} className="simulation-banner-icon" />
        <div>
          <div className="simulation-banner-title">
            {label} · Simulation mode
          </div>
          <p className="simulation-banner-copy">
            Enter picks with virtual money — outcomes settle instantly so you can see how MotiveFX
            tracks and grades your edge. No real wagers.
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
          onClick={() => subscribeModule(module)}
        >
          Upgrade to live module
        </button>
      </div>
    </div>
  );
}
