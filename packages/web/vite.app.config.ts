import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Dev/build config for the OSS dashboard SPA. In dev it proxies /api to a running API server
// (SQ_API, default the demo on :4137). The production static build (dist/app) is what the
// web façade will serve.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: {
    port: 5199,
    proxy: { "/api": process.env.SQ_API ?? "http://localhost:4137" },
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist/app"),
    emptyOutDir: false,
  },
});
