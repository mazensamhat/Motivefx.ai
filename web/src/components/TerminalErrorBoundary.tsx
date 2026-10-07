import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportClientError } from "../lib/clientTelemetry";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class TerminalErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    reportClientError({
      surface: "terminal.react",
      errorName: error.name,
      message: error.message,
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#080a0c",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>MotiveFX hit an unexpected error</h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.5 }}>
            The error was recorded for review. Reload the terminal to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              border: 0,
              borderRadius: 8,
              padding: "10px 16px",
              background: "#00e676",
              color: "#080a0c",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload terminal
          </button>
        </div>
      </div>
    );
  }
}
