import { useCallback, useState } from "react";
import { apiPost, getUserId, hasAuthSession } from "../lib/api";
import { syncSiteEntitlementsFromServer, SITE_EMBED } from "../lib/siteSession";
import type { AdvisorResult, DeepScan } from "../types";

const MODULE_LOCK_MSG = "Subscribe to unlock this intelligence market";

function isModuleLockError(msg: string): boolean {
  return msg.includes("Subscribe to unlock") || msg.includes("not included in your plan");
}

export function useAutoAnalyze(module: "trades" | "crypto" | "betting" | "penny" | "predictions", enabled: boolean) {
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [deepScan, setDeepScan] = useState<DeepScan | null>(null);

  const analyze = useCallback(async (showModal = true) => {
    if (!enabled) return false;

    if (SITE_EMBED) {
      await syncSiteEntitlementsFromServer();
    }
    if (!hasAuthSession()) return false;

    setLoading(true);
    setAnalyzeError(null);
    try {
      const userId = getUserId();
      let data: AdvisorResult;

      if (module === "trades") {
        data = await apiPost("/advisor/trades/analyze", { user_id: userId, holdings: [] });
      } else if (module === "crypto") {
        data = await apiPost("/advisor/crypto/analyze", { user_id: userId, holdings: [] });
      } else if (module === "penny") {
        data = await apiPost("/advisor/penny/analyze", { user_id: userId, holdings: [] });
      } else if (module === "predictions") {
        data = await apiPost(`/advisor/predictions/analyze?user_id=${encodeURIComponent(userId)}`, {});
      } else {
        data = await apiPost(`/advisor/betting/analyze?user_id=${encodeURIComponent(userId)}`, {});
      }

      setResult(data);
      if (showModal && data.deep_scans?.length) {
        setDeepScan(data.deep_scans[0]);
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis unavailable";

      // After Ops sync, retry once if backend modules were stale.
      if (SITE_EMBED && isModuleLockError(msg)) {
        const retry = await syncSiteEntitlementsFromServer();
        if (retry.ok) {
          try {
            const userId = getUserId();
            let data: AdvisorResult;
            if (module === "trades") {
              data = await apiPost("/advisor/trades/analyze", { user_id: userId, holdings: [] });
            } else if (module === "crypto") {
              data = await apiPost("/advisor/crypto/analyze", { user_id: userId, holdings: [] });
            } else if (module === "penny") {
              data = await apiPost("/advisor/penny/analyze", { user_id: userId, holdings: [] });
            } else if (module === "predictions") {
              data = await apiPost(`/advisor/predictions/analyze?user_id=${encodeURIComponent(userId)}`, {});
            } else {
              data = await apiPost(`/advisor/betting/analyze?user_id=${encodeURIComponent(userId)}`, {});
            }
            setResult(data);
            setAnalyzeError(null);
            if (showModal && data.deep_scans?.length) {
              setDeepScan(data.deep_scans[0]);
            }
            return true;
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : msg;
            if (retryMsg.includes("Add holdings") || retryMsg.includes("Add crypto") || retryMsg.includes("Add bets")) {
              setAnalyzeError(null);
              return false;
            }
            setAnalyzeError(retryMsg === MODULE_LOCK_MSG ? retryMsg : retryMsg);
            return false;
          }
        }
      }

      // Empty ledger is expected — don't show a scary error before the user adds positions.
      if (
        msg.includes("Add holdings") ||
        msg.includes("Add crypto") ||
        msg.includes("Add bets") ||
        msg.includes("Add prediction")
      ) {
        setAnalyzeError(null);
        return false;
      }

      setAnalyzeError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [module, enabled]);

  const applyResult = useCallback((data: AdvisorResult, showModal = true) => {
    setResult(data);
    setAnalyzeError(null);
    if (showModal && data.deep_scans?.length) {
      setDeepScan(data.deep_scans[0]);
    }
  }, []);

  const dismissScan = useCallback(() => setDeepScan(null), []);

  return { result, loading, analyzeError, deepScan, analyze, applyResult, dismissScan };
}
