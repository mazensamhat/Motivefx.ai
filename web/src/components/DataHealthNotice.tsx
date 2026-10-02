import { useEffect, useState } from "react";
/** Public feed availability is distinct from empty data or a locked subscription. */
export function DataHealthNotice() {
  const [failures, setFailures] = useState<Record<string, string>>({});
  useEffect(() => {
    const update = (event: Event) => {
      const data = (event as CustomEvent<{ path?: string; error?: string | null }>).detail;
      if (!data?.path) return;
      setFailures((previous) => {
        const next = { ...previous };
        if (data.error) next[data.path!] = data.error; else delete next[data.path!];
        return next;
      });
    };
    window.addEventListener("motivefx:feed-health", update);
    return () => window.removeEventListener("motivefx:feed-health", update);
  }, []);
  const count = Object.keys(failures).length;
  if (!count) return null;
  return <section className="card" role="alert" style={{ padding: "1rem", marginBottom: "1rem" }}>
    <h2>Some feeds could not load</h2>
    <p>{count} feed{count === 1 ? "" : "s"} unavailable. A failed request is not proof of no activity or an empty screener.</p>
    <button type="button" className="btn" onClick={() => window.dispatchEvent(new CustomEvent("motivefx:retry-feed"))}>Retry feeds</button>
    <details><summary>Show affected feeds</summary>{Object.entries(failures).map(([path, error]) => <p key={path}>{path.split("?")[0]}: {error}</p>)}</details>
  </section>;
}
