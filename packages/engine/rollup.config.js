import createConfig from "../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

export default createConfig(pkg, ["src/engine.ts", "src/workers/main.ts", "src/workers/executor.ts"]);
