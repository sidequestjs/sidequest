import { fork } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = resolve(here, "../../packages/engine/dist/workers/main.js");
const WORKER_FLAG = "--sidequest-worker";

/**
 * Forks the built worker module with the given argv and resolves with the first IPC message it
 * emits, or `null` if none arrives within the timeout. The worker is always killed afterwards.
 */
function forkWorkerAndCaptureFirstMessage(argv, timeoutMs = 2000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = fork(WORKER_PATH, argv, { stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill();
      resolvePromise(null);
    }, timeoutMs);

    child.once("message", (msg) => {
      clearTimeout(timer);
      child.kill();
      resolvePromise(msg);
    });
    child.once("error", (err) => {
      clearTimeout(timer);
      child.kill();
      rejectPromise(err);
    });
  });
}

describe("worker bootstrap gating (issue #175)", () => {
  let lastChild;

  afterEach(() => {
    lastChild?.kill();
    lastChild = undefined;
  });

  it("does NOT emit a 'ready' message when forked without the sentinel flag", async () => {
    // Reproduces a Vitest `pool: 'forks'` worker that transitively imports the engine: the process
    // has an IPC channel (process.send) but is not a Sidequest worker, so the module must stay inert.
    const msg = await forkWorkerAndCaptureFirstMessage([]);
    expect(msg).toBeNull();
  });

  it("emits 'ready' when forked with the sentinel flag", async () => {
    const msg = await forkWorkerAndCaptureFirstMessage([WORKER_FLAG]);
    expect(msg).toBe("ready");
  });
});
