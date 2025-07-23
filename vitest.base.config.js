export function createVitestConfig(setupFiles, testAliasPath) {
  return {
    test: {
      globals: true,
      environment: "node",
      isolate: true,
      pool: "threads",
      fileParallelism: false,
      coverage: {
        provider: "v8", // or 'v8'
        exclude: [
          "**/*.d.ts",
          "**/*.test.ts",
          "**/*.spec.ts",
          "**/dist/**",
          "**/node_modules/**",
          "**/migrations/**",
          "**/*.js",
          "**/*.cjs",
          "**/*.mjs",
        ],
      },
      setupFiles,
    },
    resolve: {
      alias: testAliasPath
        ? {
            "@/tests": testAliasPath,
          }
        : undefined,
    },
  };
}
