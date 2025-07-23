import path from "path";
import createConfig from "../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

import copy from 'rollup-plugin-copy';
import postcss from "rollup-plugin-postcss";
import del from 'rollup-plugin-delete';

const rootDir = path.resolve(import.meta.dirname, '../../');


const configs = createConfig(pkg, ["src/index.ts"], [
  copy({
    targets: [
      { src: "src/views/**/*", dest: "dist/views" },
      { src: 'src/public/img', dest: 'dist/public'},
      { src: 'src/public/js', dest: 'dist/public'},
      { src: path.join(rootDir, "node_modules/htmx.org/dist/htmx.min.js"), dest: "dist/public/js", rename: 'htmx.js' }
    ]
  }),
]);

configs.push(
   // Build CSS
   {
    input: 'src/public/css/styles.css',
    output: [{ file: "dist/_styles.css" }],
    plugins: [
      postcss({
        extract: 'public/css/styles.css',
        minimize: true,
      }),
      del({ targets: "dist/_styles.css"})
    ],
  },
);

export default configs;