import { useCallback, useState } from "react";
import { apiPost, getUserId, hasAuthSession } from "../lib/api";
import type { AdvisorResult, DeepScan } from "../types";

export function useAutoAnalyze(module: "trades" | "crypto" | "betting" | "penny" | "predictions", enabled: boolean) {
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [deepScan, setDeepScan] = useState<DeepScan | null>(null);

  const analyze = useCallback(async (showModal = true) => {
    if (!enabled || !hasAuthSession()) return false;
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
