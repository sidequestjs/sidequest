import { serve } from "@hono/node-server";
import { type Backend, type BackendConfig, LazyBackend } from "@sidequest/backend";
import { readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { type Context, Hono, type Next } from "hono";
import { createApiApp } from "../api/app";

/** Basic-auth credentials for the dashboard. Leaving `auth` unset serves it wide open. */
export interface DashboardAuth {
  user: string;
  password: string;
}

/** Options for {@link serveDashboard} / {@link createDashboardApp}. */
export interface DashboardOptions {
  /** A live backend to serve (preferred when booting alongside the engine). */
  backend?: Backend;
  /** A backend config to lazily build one from, when no `backend` is given. */
  backendConfig?: BackendConfig;
  /** Listen port. @default 8678 */
  port?: number;
  /** Reverse-proxy prefix the dashboard is mounted under, e.g. "/admin". @default "" */
  basePath?: string;
  /** Basic-auth credentials. Omit for a wide-open (dev-only) dashboard. */
  auth?: DashboardAuth;
  /** Sidequest version shown in the sidebar (defaults to this package's version). */
  version?: string;
  /** Backend driver name shown in the sidebar (defaults to `backendConfig.driver`). */
  driver?: string;
  /** Directory of the built SPA. @default the packaged `dist/app`. */
  staticDir?: string;
}

/** A running dashboard server. */
export interface DashboardServer {
  port: number;
  close: () => Promise<void>;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

/** A minimal HTTP basic-auth Hono middleware (avoids a `hono/basic-auth` subpath import
 * that the shared rollup build can't externalize). */
function basicAuth(user: string, password: string) {
  const expected = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  return async (c: Context, next: Next) => {
    if (c.req.header("Authorization") !== expected) {
      return c.body("Unauthorized", 401, { "WWW-Authenticate": 'Basic realm="Sidequest"' });
    }
    await next();
  };
}

/** Normalizes a base path to "" (root) or "/prefix" (no trailing slash). */
export function normalizeBase(basePath?: string): string {
  if (!basePath) {
    return "";
  }
  const trimmed = `/${basePath.replace(/^\/+|\/+$/g, "")}`;
  return trimmed === "/" ? "" : trimmed;
}

/** Reads this package's version from its package.json (for the sidebar), best-effort. */
function packageVersion(): string | undefined {
  try {
    const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version;
  } catch {
    return undefined;
  }
}

/** Injects the runtime base (for the API client + relative assets) into the SPA shell. */
function injectBase(html: string, base: string): string {
  const tag = `<script>window.__SQ_DASHBOARD_BASE__=${JSON.stringify(`${base}/`)}</script>`;
  return html.includes("</head>") ? html.replace("</head>", `${tag}</head>`) : `${tag}${html}`;
}

/**
 * createDashboardApp — the Hono app serving the management API under `<basePath>/api` and the
 * built SPA for everything else, with optional basic auth. Split out from {@link serveDashboard}
 * so it can be exercised with `app.request()` without opening a socket.
 */
export function createDashboardApp(options: DashboardOptions): Hono {
  const backend = resolveBackend(options);
  const base = normalizeBase(options.basePath);
  const staticDir = options.staticDir ?? resolve(import.meta.dirname, "../app");
  const version = options.version ?? packageVersion();
  const driver = options.driver ?? options.backendConfig?.driver;

  const app = new Hono();
  if (options.auth) {
    app.use(`${base}/*`, basicAuth(options.auth.user, options.auth.password));
  }
  app.route(`${base}/api`, createApiApp({ backend, version, driver }));
  app.get(`${base}/*`, (c) => {
    const rel = new URL(c.req.url).pathname.slice(base.length).replace(/^\/+/, "");
    const indexHtml = () => c.html(injectBase(readFileSync(join(staticDir, "index.html"), "utf8"), base));
    if (rel === "" || rel === "index.html") {
      return indexHtml();
    }
    const filePath = join(staticDir, rel);
    if (!filePath.startsWith(resolve(staticDir))) {
      return c.notFound();
    }
    try {
      const body = readFileSync(filePath);
      return c.body(body, 200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    } catch {
      // Unknown path under the SPA → serve the shell (single-page fallback).
      return indexHtml();
    }
  });
  return app;
}

function resolveBackend(options: DashboardOptions): Backend {
  if (options.backend) {
    return options.backend;
  }
  if (options.backendConfig) {
    return new LazyBackend(options.backendConfig);
  }
  throw new Error("serveDashboard requires either a `backend` or a `backendConfig`.");
}

/**
 * serveDashboard — boots an HTTP server that serves the OSS dashboard SPA and the management
 * API on one port. Pass a live `backend` (when booting with the engine) or a `backendConfig`.
 * Returns a handle to close it.
 */
export function serveDashboard(options: DashboardOptions): DashboardServer {
  const app = createDashboardApp(options);
  const port = options.port ?? 8678;
  const server = serve({ fetch: app.fetch, port });
  return {
    port,
    close: () =>
      new Promise<void>((resolvePromise, reject) => {
        server.close((err) => (err ? reject(err) : resolvePromise()));
      }),
  };
}
