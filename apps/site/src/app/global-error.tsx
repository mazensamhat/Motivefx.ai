"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        platform: "web",
        surface: "site.global-error",
        errorName: error.name,
        message: error.message,
        route: typeof window !== "undefined" ? window.location.pathname : "/",
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#080a0c", color: "#e2e8f0", fontFamily: "system-ui", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
          The error was recorded for review. Try again or refresh the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            background: "#00e676",
            color: "#080a0c",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
