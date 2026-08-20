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
import { SignalDetailHost, SignalDetailProvider } from "./hooks/useSignalDetail";
import { IntelToastProvider } from "./hooks/useIntelToast";
import { AccountSettingsHost } from "./components/AccountSettingsHost";
import { syncNativeShellDocumentClass } from "./lib/nativeShell";
import "./styles/global.css";

syncNativeShellDocumentClass();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppAgeGate>
      <AuthProvider>
        <NativeIapSessionBridge />
        {/* GenerationalProvider must wrap ModulesProvider: WinHookModal uses useGenerationalProfile */}
        <GenerationalProvider>
          <ModulesProvider>
            <PlatformPrefsProvider>
              <IntelToastProvider>
                <SignalDetailProvider>
                  <AssetDeepDiveProvider>
                    <App />
                    <AccountSettingsHost />
                    <SignalDetailHost />
                  </AssetDeepDiveProvider>
                </SignalDetailProvider>
              </IntelToastProvider>
            </PlatformPrefsProvider>
          </ModulesProvider>
        </GenerationalProvider>
      </AuthProvider>
    </AppAgeGate>
  </StrictMode>
);
