import { Bell, BellRing } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useIntelAlerts } from "../hooks/useIntelAlerts";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { formatSignalStrength } from "../config/productCopy";
import { resolveSignalDetail } from "../utils/signalIntel";

export function HomeAlertsSection() {
  const { isAuthenticated, openAuth } = useAuth();
  const { alerts, unreadCount, markSeen, markAllSeen } = useIntelAlerts();
  const { inspectDetail } = useSignalDetail();

  if (!isAuthenticated) {
    return (
      <section className="home-section home-alerts-section glass-card">
        <Bell size={20} />
        <div>
          <strong>Intel alerts</strong>
          <p>Sign in and star symbols on your radar — we flag matching signals here and in the bell menu.</p>
          <button type="button" className="btn btn-sm btn-accent-terminal" onClick={() => openAuth("register")}>
            Get started
          </button>
        </div>
      </section>
    );
  }

  function openAlert(a: (typeof alerts)[0]) {
    void markSeen(a.id);
    inspectDetail(
      resolveSignalDetail(a.title, {
        symbol: a.symbol ?? undefined,
        confidence: a.confidence ?? undefined,
        category: "Alert center",
        contextLines: [a.body ?? a.title].filter(Boolean),
        journalNote: `${a.symbol ? `$${a.symbol} · ` : ""}${a.title}`,
        journalMeta: { module: a.module ?? undefined, symbol: a.symbol ?? undefined, signalTitle: a.title },
      })
    );
  }

  async function enableBrowserAlerts() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem("motivefx_browser_alerts", "1");
      new Notification("MotiveFX alerts enabled", {
        body: "We'll notify you when new radar hits arrive while this browser is open.",
      });
    }
  }

  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2>
          <BellRing size={18} /> Intel alerts
          {unreadCount > 0 && <span className="home-alerts-unread-pill">{unreadCount} new</span>}
        </h2>
        <div className="home-alerts-header-actions">
          {unreadCount > 0 && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => void markAllSeen()}>
              Mark all read
            </button>
          )}
          {"Notification" in window && Notification.permission !== "granted" && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => void enableBrowserAlerts()}>
              Enable browser alerts
            </button>
          )}
        </div>
      </div>
      {alerts.length === 0 ? (
        <p className="home-alerts-empty">No alerts yet — add symbols to your Intel Radar above.</p>
      ) : (
        <ul className="home-alerts-list">
          {alerts.slice(0, 6).map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={`home-alert-item ${a.seen ? "seen" : "unread"}`}
                onClick={() => openAlert(a)}
              >
                <span className="home-alert-title">{a.title}</span>
                {a.body && <span className="home-alert-body">{a.body}</span>}
                {a.confidence != null && (
                  <span className="home-alert-meta">{formatSignalStrength(a.confidence)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
