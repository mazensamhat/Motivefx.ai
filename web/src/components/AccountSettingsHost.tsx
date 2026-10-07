import { lazy, Suspense } from "react";
import { useAuth } from "../hooks/useAuth";

const AccountSettingsModal = lazy(() =>
  import("./AccountSettingsModal").then((m) => ({ default: m.AccountSettingsModal }))
);

/** Must render inside ModulesProvider — Account modal embeds InstitutionalPanel (useModules). */
export function AccountSettingsHost() {
  const { user, accountOpen, closeAccount, logout, refreshUser } = useAuth();
  if (!accountOpen || !user) return null;
  return (
    <Suspense fallback={null}>
    <AccountSettingsModal
      user={user}
      onClose={closeAccount}
      onLogout={logout}
      onUserUpdated={refreshUser}
    />
    </Suspense>
  );
}
