import { createVitestConfig } from "../../vitest.base.config.js";

const base = createVitestConfig(["./vitest.setup.ts"]);

// UI components run in jsdom (the rest of the repo is node). Coverage is
// enforced at 100% over the component library only.
export default {
  ...base,
  root: import.meta.dirname,
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  test: {
    ...base.test,
    environment: "jsdom",
    include: ["src/ui/**/*.test.tsx", "src/dashboard/**/*.test.tsx"],
    coverage: {
      ...base.test.coverage,
      include: ["src/ui/**/*.tsx"],
      exclude: [...base.test.coverage.exclude, "src/ui/**/*.test.tsx", "src/ui/**/*.stories.tsx"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
};
