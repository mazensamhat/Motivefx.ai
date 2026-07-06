import type { BrandModuleId } from "../brand/moduleBrand";
import { AiRadialGauge } from "./AiRadialGauge";
import { PortfolioGrowthChart } from "./PortfolioGrowthChart";
import { hashSeed } from "../utils/sparkline";

interface Props {
  label: string;
  value: number | null | undefined;
  subtitle?: string;
  winRate?: number;
  activeStakes?: number;
  module: BrandModuleId;
}

export function PortfolioOverview({
  label,
  value,
  subtitle,
  winRate = 72,
  activeStakes,
  module,
}: Props) {
  if (value == null) return null;

  const stakes =
    activeStakes ??
    Math.round(value * 0.47 * 100) / 100;

  const chartSeed = hashSeed(`${module}-${value}`);

  return (
    <div className="hero-metric-panel">
      <div className="hero-metric-glow" aria-hidden />
      <div className="hero-metric-left">
        <div>
          <div className="hero-metric-label">{label}</div>
          <div className="hero-metric-value">
            ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {subtitle && <div className="hero-metric-sub">{subtitle}</div>}
        </div>
        <div className="hero-metric-stats">
          <div className="hero-stat-block">
            <span className="hero-stat-label">Active Stakes</span>
            <span className="hero-stat-value">
              ${stakes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="hero-stat-block hero-stat-gauge">
            <span className="hero-stat-label">Signal alignment*</span>
            <AiRadialGauge variant="winrate" value={winRate} />
          </div>
        </div>
      </div>
      <PortfolioGrowthChart portfolioValue={value} module={module} seed={chartSeed} />
    </div>
  );
}
