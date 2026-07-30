import { AccountSettingsModal } from "./AccountSettingsModal";
import { useAuth } from "../hooks/useAuth";

/** Must render inside ModulesProvider — Account modal embeds InstitutionalPanel (useModules). */
export function AccountSettingsHost() {
  const { user, accountOpen, closeAccount, logout, refreshUser } = useAuth();
  if (!accountOpen || !user) return null;
  return (
    <AccountSettingsModal
      user={user}
      onClose={closeAccount}
      onLogout={logout}
      onUserUpdated={refreshUser}
    />
  );
}
