import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: {
    port: 5280,
    strictPort: true,
    proxy: {
      // Standalone web talks to /api/terminal-auth/*; production site exposes /api/auth/*
      "/api/terminal-auth": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/terminal-auth/, "/api/auth"),
      },
      "/api": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: true,
      },
      "/go": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
