import createConfig from "../../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

export default createConfig(pkg, "src/postgres-backend.ts");
