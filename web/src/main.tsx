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
import { ThemeBrandAssets } from "./components/ThemeToggle";
import { initializeAppearance } from "./lib/appearance";
import { syncNativeShellDocumentClass } from "./lib/nativeShell";
import "./styles/global.css";
import "./styles/day-surfaces.css";
import "./styles/day-legacy-surfaces.css";
import "./styles/workspace-v2.css";
import "./styles/recovery.css";
import "./styles/responsive-layout.css";
initializeAppearance();
syncNativeShellDocumentClass();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeBrandAssets />
    <AppAgeGate><AuthProvider><NativeIapSessionBridge />
      <GenerationalProvider><ModulesProvider><PlatformPrefsProvider>
        <IntelToastProvider><SignalDetailProvider><AssetDeepDiveProvider>
          <App /><AccountSettingsHost /><SignalDetailHost />
        </AssetDeepDiveProvider></SignalDetailProvider></IntelToastProvider>
      </PlatformPrefsProvider></ModulesProvider></GenerationalProvider>
    </AuthProvider></AppAgeGate>
  </StrictMode>
);
