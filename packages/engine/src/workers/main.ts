import { logger } from "@sidequest/core";
import { WORKER_PROCESS_FLAG } from "../constants";
import { Engine, EngineConfig, NonNullableEngineConfig } from "../engine";
import { gracefulShutdown } from "../utils/shutdown";
import { WorkerRuntime } from "./worker-runtime";

export class MainWorker {
  shuttingDown = false;
  private runtime?: WorkerRuntime;
  private engine = new Engine();

  /**
   * Starts a Sidequest worker process with the given configuration.
   * @param sidequestConfig The Sidequest configuration for the worker.
   */
  async runWorker(sidequestConfig: EngineConfig) {
    if (!this.shuttingDown) {
      try {
        const nonNullConfig = await this.engine.configure({ ...sidequestConfig, skipMigration: true });
        this.runtime = new WorkerRuntime(this.engine.getBackend()!, nonNullConfig);
        await this.runtime.start();
      } catch (error) {
        logger("Worker").error(error);
        process.exit(1);
      }
    } else {
      logger("Worker").warn("Worker is already shutting down, ignoring run signal.");
    }
  }

  /**
   * Gracefully shuts down the worker and releases resources.
   */
  async shutdown() {
    if (!this.shuttingDown) {
      this.shuttingDown = true;
      logger("Worker").debug("Shutting down worker runtime");
      await this.runtime?.shutdown();
      logger("Worker").debug("Shutting down engine");
      await this.engine.close();
      logger("Worker").debug("Main worker completely shut down");
    }
  }
}

// Gate the bootstrap on the explicit flag the engine passes when forking, not on `!!process.send`.
// Any process forked over IPC (including a Vitest `pool: 'forks'` test worker that transitively
// imports this module) has `process.send`, so the old heuristic would self-initialize there and
// emit a "ready" message the host IPC layer can't handle. See issue #175.
const isChildProcess = process.argv.includes(WORKER_PROCESS_FLAG);

if (isChildProcess) {
  const worker = new MainWorker();

  process.on(
    "message",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async ({ type, sidequestConfig }: { type: string; sidequestConfig?: NonNullableEngineConfig }) => {
      if (type === "start") {
        if (!sidequestConfig) {
          throw new Error("No Sidequest configuration provided to worker!");
        }
        if (!worker.shuttingDown) {
          gracefulShutdown(worker.shutdown.bind(worker), "Worker", sidequestConfig.gracefulShutdown);
          logger("Worker").info("Starting worker with provided configuration...");
          return await worker.runWorker(sidequestConfig);
        } else {
          logger("Worker").warn("Worker is already shutting down, ignoring start signal.");
        }
      } else if (type === "shutdown") {
        if (!worker.shuttingDown) {
          logger("Worker").info("Received shutdown message, shutting down worker...");
          await worker.shutdown();
          logger("Worker").info("Worker shutdown complete.");
          process.exit(0);
        } else {
          logger("Worker").debug("Worker is already shutting down, ignoring shutdown signal.");
        }
      }
    },
  );

  process.on("disconnect", () => {
    logger("Worker").error("Parent process disconnected, exiting...");
    process.exit();
  });

  if (process.send) process.send("ready");
}
