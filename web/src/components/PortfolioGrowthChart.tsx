import { TrendingDown, TrendingUp } from "lucide-react";
import type { BrandModuleId } from "../brand/moduleBrand";
import { MODULE_BRAND } from "../brand/moduleBrand";
import { generateGrowthSeries, growthPercent } from "../utils/sparkline";
import { NeonAreaChart } from "./NeonAreaChart";

interface Props {
  portfolioValue: number;
  module: BrandModuleId;
  seed?: number;
}

export function PortfolioGrowthChart({ portfolioValue, module, seed = 0 }: Props) {
  const brand = MODULE_BRAND[module];
  const points = generateGrowthSeries(portfolioValue, 30, seed);
  const pct = growthPercent(points);
  const positive = pct >= 0;
  const color = positive ? brand.accent : "#ff5252";

  return (
    <div className="hero-growth-chart">
      <div className="hero-growth-chart-header">
        <span className="hero-growth-chart-label">30-Day Workspace Growth</span>
        <span className="hero-growth-chart-trend" style={{ color }}>
          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {positive ? "+" : ""}
          {pct.toFixed(1)}%
        </span>
      </div>
      <NeonAreaChart points={points} color={color} height={88} />
      <div className="hero-growth-chart-footer">
        <span>30 Days ago</span>
        <span>Current session</span>
      </div>
    </div>
  );
}
