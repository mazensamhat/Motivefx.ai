/** @type {import('next').NextConfig} */
const backendUrl = process.env.MOTIVEFX_API_URL?.trim() || "http://127.0.0.1:8001";

const backendPrefixes = [
  "stocks",
  "crypto",
  "betting",
  "penny",
  "predictions",
  "home",
  "news",
  "advisor",
  "admin",
];

const nextConfig = {
  transpilePackages: ["@motivefx/database"],
  async rewrites() {
    return [
      ...backendPrefixes.map((prefix) => ({
        source: `/api/${prefix}/:path*`,
        destination: `${backendUrl}/api/${prefix}/:path*`,
      })),
      { source: "/api/live-feed", destination: `${backendUrl}/api/live-feed` },
      { source: "/api/health", destination: `${backendUrl}/api/health` },
      { source: "/go/:path*", destination: `${backendUrl}/go/:path*` },
    ];
  },
};

export default nextConfig;
