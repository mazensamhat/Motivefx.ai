import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useIntelAlerts } from "../hooks/useIntelAlerts";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { formatSignalStrength } from "../config/productCopy";
import { resolveSignalDetail } from "../utils/signalIntel";

export function AlertCenterBell() {
  const { isAuthenticated, openAuth } = useAuth();
  const { alerts, unreadCount, markSeen, markAllSeen } = useIntelAlerts();
  const { inspectDetail } = useSignalDetail();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener("motivefx:open-alerts", openPanel);
    return () => window.removeEventListener("motivefx:open-alerts", openPanel);
  }, []);

  function openAlert(a: (typeof alerts)[0]) {
    void markSeen(a.id);
    inspectDetail(
      resolveSignalDetail(a.title, {
        symbol: a.symbol ?? undefined,
        confidence: a.confidence ?? undefined,
        category: "Alert center",
        contextLines: [a.body ?? a.title].filter(Boolean),
        journalNote: `${a.symbol ? `$${a.symbol} · ` : ""}${a.title}${a.body ? ` — ${a.body}` : ""}`,
        journalMeta: { module: a.module ?? undefined, symbol: a.symbol ?? undefined, signalTitle: a.title },
      })
    );
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="alert-center-trigger"
        onClick={() => (isAuthenticated ? setOpen(true) : openAuth("register"))}
        title="Intel alerts"
        aria-label={`Intel alerts${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="alert-center-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="modal-overlay alert-center-overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="alert-center-panel glass-card" onClick={(e) => e.stopPropagation()}>
            <header className="alert-center-header">
              <div>
                <h3>Intel alerts</h3>
                <p className="alert-center-sub">Radar hits and top signals · in-app for now</p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </header>

            {unreadCount > 0 && (
              <button type="button" className="btn btn-sm btn-ghost alert-center-mark-all" onClick={() => void markAllSeen()}>
                Mark all read
              </button>
            )}

            <ul className="alert-center-list">
              {alerts.length === 0 ? (
                <li className="alert-center-empty">No alerts yet — star symbols on your radar to get hits.</li>
              ) : (
                alerts.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`alert-center-item ${a.seen ? "seen" : "unread"}`}
                      onClick={() => openAlert(a)}
                    >
                      <span className="alert-center-item-title">{a.title}</span>
                      {a.body && <span className="alert-center-item-body">{a.body}</span>}
                      {a.confidence != null && (
                        <span className="alert-center-item-meta">{formatSignalStrength(a.confidence)}</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
