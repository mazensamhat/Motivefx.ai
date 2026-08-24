"use client";

type SparklineProps = {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
};

export function OpsSparkline({
  values,
  color = "#00c853",
  height = 32,
  width = 88,
}: SparklineProps) {
  const safe = values.length >= 2 ? values : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;

  const points = safe
    .map((value, index) => {
      const x = (index / (safe.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className="ops-sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
