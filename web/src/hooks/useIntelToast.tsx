import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface ToastPayload {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface IntelToastContextValue {
  showToast: (payload: ToastPayload) => void;
}

const IntelToastContext = createContext<IntelToastContextValue | null>(null);

export function IntelToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const showToast = useCallback((payload: ToastPayload) => {
    setToast(payload);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      if (detail?.message) showToast(detail);
    };
    window.addEventListener("motivefx:toast", handler);
    return () => window.removeEventListener("motivefx:toast", handler);
  }, [showToast]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <IntelToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="intel-toast" role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button type="button" className="btn btn-sm btn-accent-terminal" onClick={toast.onAction}>
              {toast.actionLabel}
            </button>
          )}
          <button type="button" className="btn-icon intel-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </IntelToastContext.Provider>
  );
}

export function useIntelToast() {
  const ctx = useContext(IntelToastContext);
  if (!ctx) throw new Error("useIntelToast must be used within IntelToastProvider");
  return ctx;
}

export function dispatchIntelToast(payload: ToastPayload) {
  window.dispatchEvent(new CustomEvent("motivefx:toast", { detail: payload }));
}
