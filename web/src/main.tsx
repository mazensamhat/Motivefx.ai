import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { ModulesProvider } from "./hooks/useModules";
import { GenerationalProvider } from "./hooks/useGenerationalProfile";
import { PlatformPrefsProvider } from "./hooks/usePlatformPrefs";
import { SignalDetailProvider } from "./hooks/useSignalDetail";
import { IntelToastProvider } from "./hooks/useIntelToast";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ModulesProvider>
        <GenerationalProvider>
          <PlatformPrefsProvider>
            <IntelToastProvider>
              <SignalDetailProvider>
                <App />
              </SignalDetailProvider>
            </IntelToastProvider>
          </PlatformPrefsProvider>
        </GenerationalProvider>
      </ModulesProvider>
    </AuthProvider>
  </StrictMode>
);
