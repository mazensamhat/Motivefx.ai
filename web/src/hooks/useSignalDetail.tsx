import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { SignalDetailModal } from "../components/SignalDetailModal";
import { resolveSignalDetail, type SignalDetailPayload } from "../utils/signalIntel";

interface SignalDetailContextValue {
  inspectSignal: (label: string, extra?: Partial<SignalDetailPayload>) => void;
  inspectDetail: (payload: SignalDetailPayload) => void;
}

const SignalDetailContext = createContext<SignalDetailContextValue | null>(null);

export function SignalDetailProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<SignalDetailPayload | null>(null);

  const inspectSignal = useCallback((label: string, extra?: Partial<SignalDetailPayload>) => {
    setDetail(resolveSignalDetail(label, extra));
  }, []);

  const inspectDetail = useCallback((payload: SignalDetailPayload) => {
    setDetail(payload);
  }, []);

  return (
    <SignalDetailContext.Provider value={{ inspectSignal, inspectDetail }}>
      {children}
      {detail && (
        <SignalDetailModal {...detail} onClose={() => setDetail(null)} />
      )}
    </SignalDetailContext.Provider>
  );
}

export function useSignalDetail() {
  const ctx = useContext(SignalDetailContext);
  if (!ctx) throw new Error("useSignalDetail must be used within SignalDetailProvider");
  return ctx;
}
