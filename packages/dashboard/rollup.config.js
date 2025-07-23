import createConfig from "../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

import copy from "rollup-plugin-copy";
import del from "rollup-plugin-delete";
import postcss from "rollup-plugin-postcss";

const copyPlugin = copy({
  targets: [
    { src: "src/views/**/*", dest: "dist/views" },
    { src: "src/public/img", dest: "dist/public" },
    { src: "src/public/js", dest: "dist/public" },
  ],
});

const configs = createConfig(pkg, ["src/index.ts"], [copyPlugin]);

configs.push(
  // Build CSS
  {
    input: "src/public/css/styles.css",
    output: [{ file: "dist/_styles.css" }],
    plugins: [
      postcss({
        extract: "public/css/styles.css",
        minimize: true,
      }),
      del({ targets: "dist/_styles.css" }),
      copyPlugin,
    ],
  },
);

export default configs;
