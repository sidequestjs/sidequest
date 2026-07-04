import createConfig from "../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

// Node build for the management API (`@sidequest/web/api`). The React UI library keeps
// its own Vite build (see vite.lib.config.ts); both write into dist/ without clobbering.
export default createConfig(pkg, "src/api/index.ts");
