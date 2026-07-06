import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

const LIFT_MULTIPLIER = 1.8;
const ANNUAL_PRICE = 799;

interface Props {
  annualPrice?: number;
}

export function ImpactCalculator({ annualPrice = ANNUAL_PRICE }: Props) {
  const [reach, setReach] = useState(10000);
  const [convRate, setConvRate] = useState(0.01);

  const result = useMemo(() => {
    const standardSubs = Math.round(reach * convRate);
    const optimizedSubs = Math.round(reach * convRate * LIFT_MULTIPLIER);
    const boost = optimizedSubs - standardSubs;
    const revenueBoost = boost * annualPrice;
    return { standardSubs, optimizedSubs, boost, revenueBoost };
  }, [reach, convRate, annualPrice]);

  return (
    <div className="impact-calculator glass-panel">
      <div className="impact-calculator-header">
        <TrendingUp size={18} className="impact-calculator-icon" />
        <div>
          <h3 className="impact-calculator-title">Impact Calculation</h3>
          <p className="impact-calculator-sub">
            Projected annual revenue boost from adaptive generational interfaces (1.8× conversion lift).
          </p>
        </div>
      </div>

      <div className="impact-calculator-fields">
        <label className="impact-field">
          <span>Estimated monthly reach</span>
          <input
            type="number"
            min={100}
            step={500}
            value={reach}
            onChange={(e) => setReach(Number(e.target.value) || 0)}
          />
        </label>
        <label className="impact-field">
          <span>Current conversion rate</span>
          <select value={convRate} onChange={(e) => setConvRate(Number(e.target.value))}>
            <option value={0.005}>0.5% (Average)</option>
            <option value={0.01}>1.0% (Standard benchmark)</option>
            <option value={0.02}>2.0% (Target minimum)</option>
          </select>
        </label>
      </div>

      <div className="impact-calculator-result">
        <span className="impact-result-badge">Projected annual revenue boost</span>
        <p className="impact-result-value">${result.revenueBoost.toLocaleString()}</p>
        <p className="impact-result-desc">
          at ${annualPrice}/yr for {result.boost} extra adaptive converters
          ({result.standardSubs} → {result.optimizedSubs} subscribers)
        </p>
      </div>
    </div>
  );
}
