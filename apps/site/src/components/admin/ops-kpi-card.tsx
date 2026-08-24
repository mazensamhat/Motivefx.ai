"use client";

import type { LucideIcon } from "lucide-react";
import { OpsSparkline } from "@/components/admin/ops-sparkline";

type KpiCardProps = {
  label: string;
  value: string | number;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  sparkline?: number[];
  sparkColor?: string;
};

export function OpsKpiCard({
  label,
  value,
  trend,
  trendTone = "neutral",
  icon: Icon,
  sparkline,
  sparkColor,
}: KpiCardProps) {
  return (
    <article className="ops-kpi-card">
      <div className="ops-kpi-card-top">
        <div>
          {Icon ? <Icon className="ops-kpi-icon" aria-hidden /> : null}
          <span className="ops-kpi-label">{label}</span>
        </div>
        {sparkline ? <OpsSparkline values={sparkline} color={sparkColor} /> : null}
      </div>
      <strong className="ops-kpi-value">{value}</strong>
      {trend ? (
        <p className={`ops-kpi-trend ${trendTone}`}>{trend}</p>
      ) : (
        <p className="ops-kpi-trend neutral">No change</p>
      )}
    </article>
  );
}
