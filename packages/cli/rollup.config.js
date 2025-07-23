import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/cli.ts",
  output: {
    file: "dist/cli.js",
    format: "esm",
    banner: "#!/usr/bin/env node",
    sourcemap: true,
  },
  external: [
    "fs",
    "path",
    "process",
    "os",
    "util",
    "url",
    "@sidequest/core",
    "@sidequest/engine",
    "commander",
    "chalk",
  ],
  plugins: [
    json(),
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      sourceMap: true,
      declaration: false,
    }),
  ],
};
