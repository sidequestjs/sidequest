import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

export default function createConfig(pkg, input = "src/index.ts", plugins = []) {
  const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ];

  // Shared base plugins (without replace)
  const basePlugins = () => [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      sourceMap: true,
      declaration: false,
      exclude: "**/*.test.ts",
      noEmitOnError: process.env.NODE_ENV !== "development",
    }),
    ...plugins,
  ];

  // Helper to conditionally add replace of import.meta.dirname and import.meta.url
  function pluginsWithReplace(isCjs = false) {
    return [
      ...(isCjs
        ? [
            replace({
              preventAssignment: true,
              delimiters: ["", ""],
              values: {
                "import.meta.dirname": "__dirname",
                "import.meta.url": "__filename",
                "import.meta.filename": "__filename",

                // Replace dynamic import with require for CJS
                // This is a workaround for CJS compatibility because otherwise it would import the module as ESM
                // and fail to correctly configure Sidequest using the CJS modules
                // Fixes: https://github.com/sidequestjs/sidequest/issues/59
                "return await import('sidequest');": "return require('sidequest');",
                '"workers", "main.js"': '"workers", "main.cjs"',
                '"shared-runner", "runner.js"': '"shared-runner", "runner.cjs"',
              },
            }),
          ]
        : []),
      ...basePlugins(),
    ];
  }

  return [
    // ESM build
    {
      input,
      output: {
        dir: "dist",
        format: "esm",
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
        sourcemap: true,
      },
      external,
      plugins: pluginsWithReplace(false),
    },
    // CJS build
    {
      input,
      output: {
        dir: "dist",
        format: "cjs",
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].cjs",
        sourcemap: true,
        exports: "named",
      },
      external,
      plugins: pluginsWithReplace(true),
    },
    // Typescript declaration files
    {
      input,
      output: {
        dir: "dist",
        format: "es",
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].d.ts",
      },
      plugins: [dts()],
    },
  ];
}
