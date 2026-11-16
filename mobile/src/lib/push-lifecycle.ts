export type PushRegistration = { userId: string; deviceId: string; revocationToken: string; pendingRevocation?: boolean; pendingTokens?: string[] };
export type PushPorts = {
  enabled: () => boolean;
  platform: () => string;
  userId: () => Promise<string | null>;
  read: () => Promise<PushRegistration | null>;
  write: (record: PushRegistration | null) => Promise<void>;
  available: () => Promise<boolean>;
  permission: (ask: boolean) => Promise<boolean>;
  token: () => Promise<string>;
  register: (token: string) => Promise<{ deviceId: string; revocationToken: string }>;
  revoke: (token: string) => Promise<boolean>;
};
export function safePushPath(path: unknown): string | null {
  // Notifications currently have one supported destination. Do not accept an
  // external link, arbitrary route, encoded separator or injected query string.
  return path === "/terminal/" || path === "/terminal" ? "/terminal/" : null;
}
export function createPushLifecycle(ports: PushPorts) {
  async function revoke() {
    if (!ports.enabled() || ports.platform() !== "android") return "inactive";
    const record = await ports.read(); if (!record) return "off";
    await ports.write({ ...record, pendingRevocation: true });
    const pending = [];
    for (const token of new Set([record.revocationToken, ...(record.pendingTokens ?? [])])) if (!await ports.revoke(token)) pending.push(token);
    if (pending.length) { await ports.write({ ...record, pendingRevocation: true, pendingTokens: pending }); return "revocation_pending"; }
    await ports.write(null); return "off";
  }
  async function reconcile(ask: boolean) {
    if (!ports.enabled() || ports.platform() !== "android") return "inactive";
    const userId = await ports.userId(), record = await ports.read();
    if (record && (record.pendingRevocation || record.userId !== userId)) {
      const result = await revoke(); if (result !== "off") return result;
      // Explicitly enabling on another account needs a new device registration;
      // backend ownership conflicts stay visible rather than silently transferring.
      if (!ask) return "off";
    }
    if (record?.pendingTokens?.length && !record.pendingRevocation) {
      const pending = [];
      for (const token of record.pendingTokens) if (!await ports.revoke(token)) pending.push(token);
      await ports.write({ ...record, pendingTokens: pending });
      if (pending.length) return "revocation_pending";
    }
    if (!userId) return "sign_in_required";
    if (!ask && !record) return "off";
    if (!await ports.available()) return "unavailable";
    if (!await ports.permission(ask)) { if (record) await revoke(); return "permission_denied"; }
    const registered = await ports.register(await ports.token());
    if (!registered.deviceId || !registered.revocationToken) throw new Error("Incomplete device registration");
    // Persist revocation capability before reporting success. If storage fails,
    // immediately attempt revocation and surface the failure.
    try { await ports.write({ userId, ...registered }); }
    catch (error) { await ports.revoke(registered.revocationToken); throw error; }
    if (record && record.deviceId !== registered.deviceId && !await ports.revoke(record.revocationToken)) {
      await ports.write({ userId, ...registered, pendingTokens: [record.revocationToken] });
      return "revocation_pending";
    }
    return "registered";
  }
  return { enable: () => reconcile(true), refresh: () => reconcile(false), revoke };
}
