type ClientErrorInput = {
  surface: string;
  errorName?: string;
  message?: string;
  route?: string;
  appVersion?: string;
};

const recent = new Map<string, number>();
let installed = false;

function signature(input: ClientErrorInput) {
  return [input.surface, input.errorName ?? "Error", input.message ?? ""].join("|").slice(0, 400);
}

export function reportClientError(input: ClientErrorInput): void {
  const key = signature(input);
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < 30_000) return;
  recent.set(key, now);
  if (recent.size > 50) {
    for (const [candidate, at] of recent) {
      if (now - at > 60_000) recent.delete(candidate);
    }
  }

  void fetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      platform: "web",
      surface: input.surface,
      errorName: (input.errorName ?? "Error").slice(0, 80),
      message: (input.message ?? "").slice(0, 1000),
      route: input.route ?? window.location.pathname,
      appVersion: input.appVersion,
    }),
  }).catch(() => undefined);
}

export function installGlobalClientErrorReporting(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportClientError({
      surface: "terminal.window",
      errorName: event.error instanceof Error ? event.error.name : "WindowError",
      message:
        event.error instanceof Error
          ? event.error.message
          : typeof event.message === "string"
            ? event.message
            : "Unhandled window error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportClientError({
      surface: "terminal.promise",
      errorName: reason instanceof Error ? reason.name : "UnhandledRejection",
      message: reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection"),
    });
  });
}
