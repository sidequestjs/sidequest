import path from "path";
import { configDefaults, defineConfig } from "vitest/config";
import { createVitestConfig } from "./vitest.base.config";

const main = createVitestConfig(["./tests/vitest.setup.ts"], path.resolve(import.meta.dirname, "./tests"));

// Two projects: the repo-wide node suite ("main", unchanged behavior) and the
// dashboard React component suite ("ui"), which needs jsdom + the React plugin.
export default defineConfig({
  test: {
    coverage: main.test.coverage,
    projects: [
      {
        ...main,
        test: {
          ...main.test,
          name: "main",
          exclude: [...configDefaults.exclude, "**/*.test.tsx"],
        },
      },
      {
        esbuild: { jsx: "automatic", jsxImportSource: "react" },
        test: {
          name: "ui",
          globals: true,
          environment: "jsdom",
          include: ["packages/dashboard/src/ui/**/*.test.tsx"],
          setupFiles: ["./packages/dashboard/vitest.setup.ts"],
        },
      },
    ],
  },
});
