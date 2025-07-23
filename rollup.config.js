import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import pkg from "./package.json" with { type: "json" };
import replace from "@rollup/plugin-replace";

const input = ["src/sidequest.ts", "src/workers/main.ts", "src/workers/executor.ts"];
const external = [...Object.keys(pkg.dependencies || {})];

// Shared base plugins (without replace)
const basePlugins = () => [
  resolve(),
  commonjs(),
  typescript({
    tsconfig: "./tsconfig.json",
    sourceMap: true,
    declaration: false,
  }),
];

// Helper to conditionally add replace of import.meta.dirname and import.meta.url
function withReplace(isCjs = false) {
  return [
    ...(isCjs
      ? [
          replace({
            preventAssignment: true,
            values: {
              "import.meta.dirname": "__dirname",
              "import.meta.url": "__filename",
              "import.meta.filename": "__filename",
            },
          }),
        ]
      : []),
    ...basePlugins(),
  ];
}

export default [
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
    plugins: withReplace(false),
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
    plugins: withReplace(true),
  },
  // Typescript declaration files
  {
    input: "src/sidequest.ts",
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
