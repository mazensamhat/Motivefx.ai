/** Deterministic pseudo-random from string seed */
export function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** 30-day portfolio growth series ending at `endValue` */
export function generateGrowthSeries(endValue: number, days = 30, seed = 0): number[] {
  if (endValue <= 0) return Array(days).fill(0);
  const startRatio = 0.78 + (seed % 14) * 0.01;
  const start = endValue * startRatio;
  const points: number[] = [];

  for (let i = 0; i < days; i++) {
    const t = days <= 1 ? 1 : i / (days - 1);
    const wave =
      Math.sin(i * 0.55 + seed * 0.1) * endValue * 0.025 +
      Math.cos(i * 0.35 + seed * 0.07) * endValue * 0.015;
    points.push(Math.max(0, start + (endValue - start) * t + wave));
  }
  points[points.length - 1] = endValue;
  return points;
}

export function growthPercent(points: number[]): number {
  if (points.length < 2) return 0;
  const start = points[0];
  const end = points[points.length - 1];
  if (!start) return 0;
  return ((end - start) / start) * 100;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export function normalizePoints(
  values: number[],
  width: number,
  height: number,
  padding = 8
): ChartPoint[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const innerH = height - padding * 2;

  return values.map((p, i) => ({
    x: values.length <= 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: height - padding - ((p - min) / range) * innerH,
  }));
}

export function smoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    d += ` C ${cpX1} ${prev.y}, ${cpX1} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function areaPath(linePath: string, width: number, height: number): string {
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

/** Intraday micro-chart from row seed */
export function generateMicroSeries(seed: number, base = 100, points = 12): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const drift = Math.sin(i * 0.8 + seed * 0.03) * base * 0.04;
    const step = Math.cos(i * 0.5 + seed * 0.02) * base * 0.03;
    v = Math.max(base * 0.85, v + drift + step);
    out.push(v);
  }
  return out;
}
