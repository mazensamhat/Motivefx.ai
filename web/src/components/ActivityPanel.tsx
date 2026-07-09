import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Filter, HelpCircle, RefreshCw } from "lucide-react";
import type { BrandModuleId } from "../brand/moduleBrand";
import { brandToPlatformModule } from "../config/tradingPlatforms";
import { apiGet, getUserId } from "../lib/api";
import { buildAssetDeepDive } from "../utils/assetDeepDive";
import { activityWhyToDetail } from "../utils/signalIntel";
import { formatTime, formatUsd, formatShares, formatPrice } from "../utils/formatActivity";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { AiExplainModal } from "./AiExplainModal";
import { AssetDeepDiveModal } from "./AssetDeepDiveModal";
import { VirtualizedTable, type VirtualColumn } from "./VirtualizedTable";

export interface ActivityFilter {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "datetime-local";
  placeholder?: string;
  options?: { value: string; label: string }[];
  param: string;
}

export interface ActivityWhyPayload {
  title: string;
  symbol?: string;
  confidence: number;
  reasons: string[];
  signals?: string[];
}

interface Props {
  title: string;
  subtitle?: string;
  endpoint: string;
  module: BrandModuleId;
  filters: ActivityFilter[];
  columns: VirtualColumn<Record<string, unknown>>[];
  emptyMessage?: string;
  buildWhy?: (row: Record<string, unknown>) => ActivityWhyPayload;
}

export { formatTime, formatUsd, formatShares, formatPrice };

export function ActivityPanel({
  title,
  subtitle = "Consolidated flow ledger. Click rows for deep-dive — use Why? for signal context.",
  endpoint,
  module,
  filters,
  columns,
  emptyMessage,
  buildWhy,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deepDiveRow, setDeepDiveRow] = useState<Record<string, unknown> | null>(null);
  const [explain, setExplain] = useState<ActivityWhyPayload | null>(null);
  const { inspectDetail } = useSignalDetail();
  const platformModule = brandToPlatformModule(module);

  const tableColumns = useMemo(() => {
    const cols = [...columns];
    if (buildWhy) {
      const whyCol: VirtualColumn<Record<string, unknown>> = {
        key: "_why",
        label: "",
        width: "52px",
        render: (row) => (
          <button
            type="button"
            className="btn btn-sm btn-why activity-why-btn"
            onClick={(e) => {
              e.stopPropagation();
              setExplain(buildWhy(row));
            }}
          >
            <HelpCircle size={12} />
          </button>
        ),
      };
      cols.push(whyCol);
    }
    const diveCol: VirtualColumn<Record<string, unknown>> = {
      key: "_dive",
      label: "",
      width: "44px",
      render: (row) => (
        <button
          type="button"
          className="btn btn-sm btn-ghost activity-dive-btn"
          title="Deep dive"
          onClick={(e) => {
            e.stopPropagation();
            setDeepDiveRow(row);
          }}
        >
          <BarChart3 size={12} />
        </button>
      ),
    };
    cols.push(diveCol);
    return cols;
  }, [columns, buildWhy]);

  function handleRowClick(row: Record<string, unknown>) {
    if (buildWhy) {
      inspectDetail(activityWhyToDetail(buildWhy(row), platformModule));
    } else {
      setDeepDiveRow(row);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ user_id: getUserId() });
      for (const f of filters) {
        const v = values[f.key]?.trim();
        if (v) params.set(f.param, v);
      }
      const data = await apiGet<{ items: Record<string, unknown>[]; count?: number }>(
        `${endpoint}?${params.toString()}`
      );
      setItems(data.items ?? []);
      setCount(data.count ?? data.items?.length ?? 0);
    } catch (e) {
      setItems([]);
      setCount(0);
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters, values]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function clearFilters() {
    setValues({});
  }

  return (
    <>
      {explain && (
        <AiExplainModal {...explain} module={platformModule} onClose={() => setExplain(null)} />
      )}
      <div className="card glass-card activity-panel terminal-panel">
        <div className="card-header card-header-bold">
          <div>
            <h2 className="card-title card-title-lg">{title}</h2>
            <p className="activity-panel-sub">{subtitle}</p>
          </div>
          <div className="activity-actions">
            <span className="activity-count">{count} records</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters((s) => !s)}>
              <Filter size={14} /> Filters
            </button>
            <button className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="activity-filters">
            {filters.map((f) => (
              <label key={f.key} className="filter-field">
                <span>{f.label}</span>
                {f.type === "select" ? (
                  <select
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  >
                    <option value="">All</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
              </label>
            ))}
            <button className="btn btn-primary btn-sm" onClick={fetchData}>Apply</button>
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
          </div>
        )}

        <div className="card-body flush activity-table-wrap">
          {loading && items.length === 0 ? (
            <div className="loading">Loading activity…</div>
          ) : error && items.length === 0 ? (
            <div className="empty">
              {error}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: "0.75rem" }} onClick={fetchData}>
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="empty">{emptyMessage ?? "No activity matches your filters."}</div>
          ) : (
            <VirtualizedTable
              items={items}
              columns={tableColumns}
              rowHeight={56}
              maxHeight="min(28rem, 62vh)"
              onRowClick={handleRowClick}
            />
          )}
        </div>
      </div>

      <AssetDeepDiveModal
        payload={deepDiveRow ? buildAssetDeepDive(deepDiveRow, module) : null}
        module={module}
        onClose={() => setDeepDiveRow(null)}
      />
    </>
  );
}
