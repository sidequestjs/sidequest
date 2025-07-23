import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

import pkg from "./package.json" with { type: "json" };

const external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})];

export default {
  input: "src/cli.ts",
  output: {
    file: "dist/cli.js",
    format: "esm",
    banner: "#!/usr/bin/env node",
    sourcemap: true,
  },
  external: external,
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
