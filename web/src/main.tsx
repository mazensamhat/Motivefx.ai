import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppAgeGate } from "./components/AgeGateModal";
import { NativeIapSessionBridge } from "./components/NativeIapSessionBridge";
import { AuthProvider } from "./hooks/useAuth";
import { ModulesProvider } from "./hooks/useModules";
import { GenerationalProvider } from "./hooks/useGenerationalProfile";
import { PlatformPrefsProvider } from "./hooks/usePlatformPrefs";
import { AssetDeepDiveProvider } from "./hooks/useAssetDeepDive";
import { SignalDetailProvider } from "./hooks/useSignalDetail";
import { IntelToastProvider } from "./hooks/useIntelToast";
import { AccountSettingsHost } from "./components/AccountSettingsHost";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppAgeGate>
      <AuthProvider>
        <NativeIapSessionBridge />
        <ModulesProvider>
          <GenerationalProvider>
            <PlatformPrefsProvider>
              <IntelToastProvider>
                <SignalDetailProvider>
                  <AssetDeepDiveProvider>
                    <App />
                    <AccountSettingsHost />
                  </AssetDeepDiveProvider>
                </SignalDetailProvider>
              </IntelToastProvider>
            </PlatformPrefsProvider>
          </GenerationalProvider>
        </ModulesProvider>
      </AuthProvider>
    </AppAgeGate>
  </StrictMode>
);
