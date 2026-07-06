export function formatTime(ts: unknown) {
  if (!ts || typeof ts !== "string") return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts.slice(0, 16);
  }
}

export function formatUsd(n: unknown) {
  const v = Number(n);
  if (!v) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatShares(n: unknown) {
  const v = Number(n);
  if (!v) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

export function formatPrice(n: unknown) {
  const v = Number(n);
  if (!v) return "—";
  if (v >= 1000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}
