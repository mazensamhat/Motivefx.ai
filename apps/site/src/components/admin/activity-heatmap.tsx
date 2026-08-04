"use client";

function heatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "rgba(255,255,255,0.04)";
  const t = Math.min(1, value / max);
  return `rgba(0, 230, 118, ${0.14 + t * 0.78})`;
}

export type ActivityHeatmapData = {
  days: string[];
  modules: string[];
  cells: Record<string, Record<string, number>>;
  max: number;
};

export function ActivityHeatmap({
  heatmap,
  moduleLabels,
  title = "Module activity heatmap (14 days)",
}: {
  heatmap: ActivityHeatmapData;
  moduleLabels?: Record<string, string>;
  title?: string;
}) {
  const hasData = Object.values(heatmap.cells).some((row) =>
    Object.values(row).some((value) => value > 0)
  );
  const totalEvents = Object.values(heatmap.cells).reduce(
    (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0),
    0
  );

  return (
    <section className="admin-panel app-panel">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2>{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {hasData
              ? `${totalEvents.toLocaleString()} events · peak cell ${heatmap.max}`
              : "Awaiting terminal / API usage events"}
          </p>
        </div>
        <div className="admin-heat-legend" aria-hidden>
          <span>Low</span>
          <span className="admin-heat-swatch" style={{ background: heatColor(1, 4) }} />
          <span className="admin-heat-swatch" style={{ background: heatColor(2, 4) }} />
          <span className="admin-heat-swatch" style={{ background: heatColor(3, 4) }} />
          <span className="admin-heat-swatch" style={{ background: heatColor(4, 4) }} />
          <span>High</span>
        </div>
      </div>

      {heatmap.modules.length === 0 ? (
        <p className="text-sm text-slate-400">No activity modules have reported usage yet.</p>
      ) : (
        <>
          {!hasData && (
            <p className="mb-3 text-sm text-slate-400">
              No usage events in the last 14 days. Heatmap cells will light up as users open
              terminal boards or call the API.
            </p>
          )}
          <div className="admin-heatmap-wrap">
            <table className="admin-heatmap">
              <thead>
                <tr>
                  <th>Module</th>
                  {heatmap.days.map((d) => (
                    <th key={d}>{d.slice(5)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.modules.map((mod) => (
                  <tr key={mod}>
                    <td>{moduleLabels?.[mod] ?? mod}</td>
                    {heatmap.days.map((day) => {
                      const val = heatmap.cells[mod]?.[day] ?? 0;
                      return (
                        <td
                          key={day}
                          className="admin-heatmap-cell"
                          style={{ background: heatColor(val, heatmap.max) }}
                          title={`${moduleLabels?.[mod] ?? mod} · ${day}: ${val} events`}
                        >
                          {val > 0 ? val : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
