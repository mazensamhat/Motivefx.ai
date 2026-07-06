import { useEffect, useId, useRef, useState } from "react";
import { areaPath, normalizePoints, smoothPath } from "../utils/sparkline";

interface Props {
  points: number[];
  color: string;
  height?: number;
  showNodes?: boolean;
  showGrid?: boolean;
  className?: string;
}

export function NeonAreaChart({
  points,
  color,
  height = 80,
  showNodes = false,
  showGrid = false,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(380);
  const gradId = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(120, entry.contentRect.width));
    });
    ro.observe(el);
    setWidth(Math.max(120, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  if (points.length < 2) return null;

  const normalized = normalizePoints(points, width, height);
  const line = smoothPath(normalized);
  const fill = areaPath(line, width, height);
  const last = normalized[normalized.length - 1];

  return (
    <div ref={wrapRef} className={`neon-area-chart ${className}`.trim()} style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={showGrid ? 0.15 : 0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && (
          <>
            <line x1={0} y1={height * 0.25} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />
            <line x1={0} y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />
            <line x1={0} y1={height * 0.75} x2={width} y2={height * 0.75} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />
          </>
        )}
        <path d={fill} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          className="neon-area-line"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
        {showNodes &&
          normalized.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill="#080a0c"
              stroke={color}
              strokeWidth={1.5}
            />
          ))}
        {!showNodes && last && (
          <circle cx={last.x} cy={last.y} r={4} fill={color} className="neon-area-pulse" />
        )}
      </svg>
    </div>
  );
}
