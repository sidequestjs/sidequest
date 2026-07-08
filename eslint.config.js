// @ts-check

import eslint from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/public/**",
      "**/views/**",
      "**/migrations/**",
      "**/storybook-static/**",
      "packages/docs/.vitepress/cache/**",
      "packages/web/vite.lib.config.ts",
      "packages/web/vite.app.config.ts",
      "packages/web/vitest.setup.ts",
      "packages/web/.storybook/**",
    ],
  },
  {
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.mts", "**/*.cts", "**/*.tsx"],
    extends: [tseslint.configs.recommendedTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        sourceType: "module",
      },
    },
  },
  {
    // React UI + dashboard app live in their own tsconfig (JSX, DOM libs, bundler resolution).
    files: ["packages/web/src/ui/**/*.{ts,tsx}", "packages/web/src/dashboard/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: false,
        project: ["./packages/web/tsconfig.ui.json"],
        tsconfigRootDir: import.meta.dirname,
        sourceType: "module",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
);
