import createConfig from "../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

import copy from "rollup-plugin-copy";
import del from "rollup-plugin-delete";
import postcss from "rollup-plugin-postcss";

const configs = createConfig(pkg, "src/index.ts", [
  copy({
    verbose: true,
    // These are copied only once in dev mode
    copyOnce: true,
    targets: [
      {
        src: "../../node_modules/htmx.org/dist/htmx.min.js",
        dest: "dist/public/js",
        rename: "htmx.js",
      },
      {
        src: "../../node_modules/feather-icons/dist/feather.min.js",
        dest: "dist/public/js",
        rename: "feather-icons.js",
      },
      {
        src: "../../node_modules/@highlightjs/cdn-assets/highlight.min.js",
        dest: "dist/public/js",
        rename: "highlight.js",
      },
    ],
  }),
]);

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
      // Need to specify "writeBundle" to delete the file after it has been created
      del({ targets: "./dist/_styles.css", verbose: true, hook: "writeBundle" }),
      // We copy those here because then, in dev mode, we re-copy these files if something
      // changes inside those dirs.
      copy({
        verbose: true,
        targets: [
          { src: "src/views", dest: "dist" },
          { src: "src/public/img", dest: "dist/public" },
          { src: "src/public/js", dest: "dist/public" },
        ],
      }),
    ],
  },
);

export default configs;
