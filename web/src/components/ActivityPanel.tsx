import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { BarChart3, Filter, HelpCircle, RefreshCw, X } from "lucide-react";
import type { BrandModuleId } from "../brand/moduleBrand";
import { brandToPlatformModule } from "../config/tradingPlatforms";
import { useMediaQuery } from "../hooks/useMediaQuery";
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

function ActivitySkeleton() {
  return (
    <div className="activity-skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="activity-skeleton-card">
          <div className="activity-skeleton-line activity-skeleton-line-lg" />
          <div className="activity-skeleton-row">
            <div className="activity-skeleton-pill" />
            <div className="activity-skeleton-line" />
            <div className="activity-skeleton-line activity-skeleton-line-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterFields({
  filters,
  values,
  setValues,
}: {
  filters: ActivityFilter[];
  values: Record<string, string>;
  setValues: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  return (
    <>
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
    </>
  );
}

export function ActivityPanel({
  title,
  subtitle = "See who's buying and selling. Tap a card for context.",
  endpoint,
  module,
  filters,
  columns,
  emptyMessage,
  buildWhy,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [values, setValues] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepDiveRow, setDeepDiveRow] = useState<Record<string, unknown> | null>(null);
  const [explain, setExplain] = useState<ActivityWhyPayload | null>(null);
  const { inspectDetail } = useSignalDetail();
  const platformModule = brandToPlatformModule(module);

  const activeFilterCount = useMemo(
    () => filters.reduce((n, f) => (values[f.key]?.trim() ? n + 1 : n), 0),
    [filters, values]
  );

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
      if (!params.has("limit")) params.set("limit", "40");
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

  function applyFilters() {
    void fetchData();
    if (isMobile) setShowFilters(false);
  }

  const emptyCopy = emptyMessage ?? "No activity yet. Check back soon for fresh flow.";

  return (
    <>
      {explain && (
        <AiExplainModal {...explain} module={platformModule} onClose={() => setExplain(null)} />
      )}
      <div className={`card glass-card activity-panel terminal-panel ${isMobile ? "activity-panel-mobile" : ""}`}>
        <div className="card-header card-header-bold">
          <div>
            <h2 className="card-title card-title-lg">{title}</h2>
            <p className="activity-panel-sub">{isMobile ? "Who's buying & selling right now." : subtitle}</p>
          </div>
          <div className="activity-actions">
            <span className="activity-count">
              {loading && items.length === 0
                ? "Loading…"
                : isMobile
                  ? count === 0
                    ? "No activity yet"
                    : `${count} moves`
                  : `${count} records`}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 ? (
                <span className="activity-filter-badge">{activeFilterCount}</span>
              ) : null}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {showFilters && !isMobile && (
          <div className="activity-filters">
            <FilterFields filters={filters} values={values} setValues={setValues} />
            <button type="button" className="btn btn-primary btn-sm" onClick={applyFilters}>Apply</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
          </div>
        )}

        {showFilters && isMobile && (
          <div className="activity-filter-sheet-overlay" onClick={() => setShowFilters(false)} role="presentation">
            <div
              className="activity-filter-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-label="Activity filters"
            >
              <div className="activity-filter-sheet-head">
                <h3>Filters</h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowFilters(false)} aria-label="Close filters">
                  <X size={16} />
                </button>
              </div>
              <div className="activity-filters activity-filters-sheet">
                <FilterFields filters={filters} values={values} setValues={setValues} />
              </div>
              <div className="activity-filter-sheet-actions">
                <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear</button>
                <button type="button" className="btn btn-primary" onClick={applyFilters}>Show results</button>
              </div>
            </div>
          </div>
        )}

        <div className="card-body flush activity-table-wrap">
          {loading && items.length === 0 ? (
            <ActivitySkeleton />
          ) : error && items.length === 0 ? (
            <div className="activity-empty">
              <strong>Couldn&apos;t load activity</strong>
              <p>{error}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={fetchData}>
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="activity-empty">
              <strong>No activity yet</strong>
              <p>{emptyCopy}</p>
              {activeFilterCount > 0 ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
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
