import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const pkgDir = import.meta.dirname;

// Vite builds the `@sidequest/dashboard/ui` component library. The Express
// server keeps its own Rollup build (see rollup.config.js) untouched.
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: resolve(pkgDir, "tsconfig.ui.json"),
      entryRoot: resolve(pkgDir, "src/ui"),
      include: ["src/ui/**/*.ts", "src/ui/**/*.tsx"],
      exclude: ["src/ui/**/*.test.tsx", "src/ui/**/*.stories.tsx"],
      outDir: resolve(pkgDir, "dist/ui"),
    }),
  ],
  build: {
    outDir: resolve(pkgDir, "dist/ui"),
    emptyOutDir: false,
    lib: {
      entry: resolve(pkgDir, "src/ui/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
});
