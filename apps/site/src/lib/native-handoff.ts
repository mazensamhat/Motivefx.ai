export function safeTerminalNext(nextPath: string | null | undefined): string {
  const raw = nextPath?.trim() || "/terminal";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/terminal";
  if (raw === "/terminal/" || raw.startsWith("/terminal/?")) {
    return raw.replace("/terminal/", "/terminal");
  }
  return raw;
}
