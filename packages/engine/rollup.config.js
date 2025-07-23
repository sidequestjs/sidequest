import createConfig from "../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

export default createConfig(pkg, {
  engine: "src/engine.ts",
  "workers/main": "src/workers/main.ts",
  "workers/executor": "src/workers/executor.ts",
});
