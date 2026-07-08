import { resolve } from "node:path";
import { mockBackend } from "../api/testing/mock-backend";
import { createDashboardApp, normalizeBase } from "./serve";

const STATIC_DIR = resolve(import.meta.dirname, "__fixtures__/app");

describe("normalizeBase", () => {
  it("normalizes to '' (root) or '/prefix'", () => {
    expect(normalizeBase()).toBe("");
    expect(normalizeBase("")).toBe("");
    expect(normalizeBase("/")).toBe("");
    expect(normalizeBase("admin")).toBe("/admin");
    expect(normalizeBase("/admin/")).toBe("/admin");
  });
});

describe("createDashboardApp", () => {
  const backend = mockBackend();
  const app = () =>
    createDashboardApp({ backend, staticDir: STATIC_DIR, version: "9.9.9", driver: "@sidequest/sqlite-backend" });

  it("routes the management API under /api", async () => {
    const res = await app().request("/api/overview");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ total: 0 });
  });

  it("serves the SPA shell with the injected base at root", async () => {
    const res = await app().request("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain('window.__SQ_DASHBOARD_BASE__="/"');
  });

  it("serves static assets with a content type", async () => {
    const res = await app().request("/assets/app.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("javascript");
  });

  it("falls back to the shell for unknown SPA paths", async () => {
    const res = await app().request("/some/deep/route");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("__SQ_DASHBOARD_BASE__");
  });

  it("serves under a base path and ignores paths outside it", async () => {
    const scoped = createDashboardApp({ backend, staticDir: STATIC_DIR, basePath: "/dash" });
    expect((await scoped.request("/dash/api/overview")).status).toBe(200);
    expect(await (await scoped.request("/dash/")).text()).toContain('window.__SQ_DASHBOARD_BASE__="/dash/"');
    expect((await scoped.request("/api/overview")).status).toBe(404);
  });

  it("enforces basic auth when configured", async () => {
    const secured = createDashboardApp({ backend, staticDir: STATIC_DIR, auth: { user: "admin", password: "s3cret" } });
    expect((await secured.request("/api/overview")).status).toBe(401);
    const ok = await secured.request("/api/overview", {
      headers: { Authorization: `Basic ${Buffer.from("admin:s3cret").toString("base64")}` },
    });
    expect(ok.status).toBe(200);
  });

  it("throws without a backend or backend config", () => {
    expect(() => createDashboardApp({ staticDir: STATIC_DIR })).toThrow(/backend/);
  });
});
