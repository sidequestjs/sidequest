import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const APP_PATH = resolve(here, "pino-logger-app.mjs");

/**
 * Runs the pino app in its own Node process (so Sidequest really forks the engine and starts
 * worker threads) and resolves with its exit code and stdout lines.
 */
function runApp(backendFile) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [APP_PATH, backendFile], { stdio: ["ignore", "pipe", "inherit"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.once("error", rejectPromise);
    child.once("exit", (code) => {
      resolvePromise({ code, lines: stdout.split("\n").filter(Boolean) });
    });
  });
}

describe("pino logger adapter", () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("writes every entry through pino, from the app, the engine process and the job thread", async () => {
    dir = mkdtempSync(join(tmpdir(), "sidequest-pino-"));

    const { code, lines } = await runApp(join(dir, "sidequest.sqlite"));

    expect(code).toBe(0);
    // Every line must be pino JSON: a line printed by the default winston console would not parse.
    const entries = lines.map((line) => JSON.parse(line));
    expect(entries).toContainEqual(
      expect.objectContaining({ level: 30, scope: "Worker", msg: "Starting worker with provided configuration..." }),
    );
    const jobEntry = entries.find((entry) => entry.scope === "LoggingJob");
    expect(jobEntry).toMatchObject({ level: 30, msg: "Hello from a worker thread" });
    expect(jobEntry.threadId).toBeGreaterThan(0);
    // The app process and the forked engine process.
    expect(new Set(entries.map((entry) => entry.pid)).size).toBe(2);
  }, 30_000);
});
