import createConfig from "../../rollup.config.base.js";
import pkg from "./package.json" with { type: "json" };

// Node builds for the management API (`@sidequest/web/api`) and the dashboard façade
// (`@sidequest/web/server`). The React UI library keeps its own Vite build (see
// vite.lib.config.ts) and the SPA its own (vite.app.config.ts); all write into dist/
// without clobbering (preserveModules mirrors src/ → dist/api, dist/server, …).
export default createConfig(pkg, ["src/api/index.ts", "src/server/index.ts"]);
