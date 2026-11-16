"use client";

import { useEffect, useState } from "react";
import { safeErrorFrames } from "../../../../packages/shared/src/error-frames";
import { claimChunkRecovery, isChunkLoadFailure, type ChunkRecoveryResult } from "../lib/chunk-recovery";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovery, setRecovery] = useState<ChunkRecoveryResult | null>(null);
  const chunkFailure = isChunkLoadFailure(error);

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
        sourceFrames: safeErrorFrames(error.stack),
        appVersion: process.env.NEXT_PUBLIC_RELEASE_VERSION,
        route: typeof window !== "undefined" ? window.location.pathname : "/",
      }),
    }).catch(() => undefined);

    const result = claimChunkRecovery({
      error,
      online: navigator.onLine,
      storage: () => window.sessionStorage,
    });
    setRecovery(result);
    if (result === "reload") window.location.reload();
  }, [error]);

  const message = recovery === "offline"
    ? "You appear to be offline. Reconnect, then reload this page."
    : recovery === "reload"
      ? "Reloading once to retry the page files."
      : recovery === "already_attempted"
        ? "A required page file is unavailable. The automatic retry has stopped. Check your connection and reload when you are ready."
        : chunkFailure
          ? "A required page file could not be loaded. Reload this page to try again."
          : "We could not load this page. Try again or refresh the page.";

  return (
    <html lang="en">
      <body style={{ background: "#080a0c", color: "#e2e8f0", fontFamily: "system-ui", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{chunkFailure ? "This page could not finish loading" : "Something went wrong"}</h1>
        <p role="status" style={{ color: "#94a3b8", marginBottom: "1rem" }}>
          {message}
        </p>
        <button
          type="button"
          onClick={() => chunkFailure ? window.location.reload() : reset()}
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
          {chunkFailure ? "Reload page" : "Try again"}
        </button>
      </body>
    </html>
  );
}
