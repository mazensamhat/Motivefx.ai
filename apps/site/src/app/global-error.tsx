"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#080a0c", color: "#e2e8f0", fontFamily: "system-ui", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
          Try refreshing. If this persists, restart the dev server and clear the Next.js cache.
        </p>
        <pre
          style={{
            fontSize: "0.75rem",
            color: "#64748b",
            overflow: "auto",
            padding: "1rem",
            background: "#12161c",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {error.message}
        </pre>
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
