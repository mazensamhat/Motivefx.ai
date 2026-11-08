import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/** Default share card. Copy is the existing tagline and product names — no stats. */
export function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#070b10",
          color: "#f8fafc",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 6,
            color: "#00e676",
            textTransform: "uppercase",
          }}
        >
          MotiveFX.AI
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 20,
            maxWidth: 980,
          }}
        >
          Predictive Market Intelligence
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            lineHeight: 1.4,
            color: "#94a3b8",
            marginTop: 28,
            maxWidth: 920,
          }}
        >
          Motive Signal, Opportunity Radar, and Relationship Graph. Informational research — not
          financial advice.
        </div>
      </div>
    ),
    { ...ogSize }
  );
}
