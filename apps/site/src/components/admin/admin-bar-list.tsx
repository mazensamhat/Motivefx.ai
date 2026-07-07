export function BarList({
  items,
  labelKey,
  valueKey,
}: {
  items: { [k: string]: string | number }[];
  labelKey: string;
  valueKey: string;
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <div className="admin-bar-list">
      {items.map((item) => (
        <div key={String(item[labelKey])} className="admin-bar-row">
          <span className="admin-bar-label">{String(item[labelKey] ?? "—")}</span>
          <div className="admin-bar-track">
            <div
              className="admin-bar-fill"
              style={{ width: `${((Number(item[valueKey]) || 0) / max) * 100}%` }}
            />
          </div>
          <span className="admin-bar-val">{item[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
