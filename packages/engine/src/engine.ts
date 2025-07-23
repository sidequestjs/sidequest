import { Backend, BackendConfig, createBackendFromDriver, NewQueueData } from "@sidequest/backend";
import { configureLogger, logger, LoggerOptions, QueueConfig } from "@sidequest/core";
import { ChildProcess, fork } from "child_process";
import path from "path";
import { JobClassType } from "./job/job";
import { JobBuilder } from "./job/job-builder";
import { grantQueueConfig } from "./queue/grant-queue-config";
import { gracefulShutdown } from "./utils/shutdown";

const workerPath = path.resolve(import.meta.dirname, "workers", "main.js");

let _backend: Backend | undefined;
let _config: SidequestConfig | undefined;
let _mainWorker: ChildProcess | undefined;
let shuttingDown = false;

/**
 * Configuration options for the Sidequest engine.
 */
export interface SidequestConfig {
  /** Backend configuration. */
  backend?: BackendConfig;
  /** List of queue configurations. */
  queues?: NewQueueData[];
  /** Logger configuration options. */
  logger?: LoggerOptions;
  /** Maximum number of concurrent jobs. */
  maxConcurrentJobs?: number;
  skipMigration?: boolean;
}

/**
 * The main engine for managing job queues and workers in Sidequest.
 */
export class Engine {
  /**
   * Configures the Sidequest engine with the provided configuration.
   * @param config Optional configuration object.
   * @returns The resolved configuration.
   */
  static async configure(config?: SidequestConfig): Promise<SidequestConfig> {
    if (_config) {
      logger().debug("Sidequest already configured");
      return _config;
    }
    _config = {
      queues: [],
      backend: {
        driver: "@sidequest/sqlite-backend",
      },
      ...config,
    };

    if (_config?.logger) {
      configureLogger(_config.logger);
    }

    _backend = await createBackendFromDriver(_config.backend!);

    if (!config?.skipMigration) {
      await _backend.migrate();
    }

    if (_config.queues) {
      for (const queue of _config.queues) {
        await grantQueueConfig(queue.name, queue);
      }
    }

    return _config;
  }

  /**
   * Starts the Sidequest engine and worker process.
   * @param config Optional configuration object.
   */
  static async start(config?: SidequestConfig): Promise<void> {
    config = await Engine.configure(config);

    logger().info(`Starting Sidequest using backend ${config.backend?.driver}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("timeout on starting sidequest fork!"));
      }, 5000);

      if (!_mainWorker) {
        const runWorker = () => {
          _mainWorker = fork(workerPath);
          _mainWorker.on("message", (msg) => {
            if (msg === "ready") {
              _mainWorker?.send({ type: "start", sidequestConfig: config });
              clearTimeout(timeout);
              resolve();
            }
          });

          _mainWorker.on("exit", () => {
            if (!shuttingDown) {
              logger().error("sidequest main exited, creating new...");
              runWorker();
            }
          });
        };

        runWorker();

        gracefulShutdown(async () => {
          shuttingDown = true;
          if (_mainWorker) {
            _mainWorker.send({ type: "shutdown" });
            await new Promise((resolve) => {
              _mainWorker?.on("exit", resolve);
            });
          }
          await Engine.close();
        }, "Engine");
      }
    });
  }

  /**
   * Gets the current engine configuration.
   * @returns The current configuration, if set.
   */
  static getConfig() {
    return _config;
  }

  /**
   * Gets the backend instance in use by the engine.
   * @returns The backend instance, if set.
   */
  static getBackend() {
    return _backend;
  }

  /**
   * Gets the configuration for a specific queue.
   * @param queue The queue name.
   * @returns The queue configuration, if found.
   */
  static async getQueueConfig(queue: string): Promise<QueueConfig | undefined> {
    if (!_backend) throw new Error("Engine not configured. Call Engine.configure() or Engine.start() first.");
    return _backend.getQueueConfig(queue);
  }

  /**
   * Closes the engine and releases resources.
   */
  static async close() {
    _config = undefined;
    return _backend?.close();
  }

  /**
   * Builds a job using the provided job class.
   * @param JobClass The job class constructor.
   * @returns A new JobBuilder instance for the job class.
   */
  static build<T extends JobClassType>(JobClass: T) {
    if (!_config) throw new Error("Engine not configured. Call Engine.configure() or Engine.start() first.");
    if (shuttingDown) {
      throw new Error("Engine is shutting down, cannot build job.");
    }
    return new JobBuilder(JobClass);
  }
}

export { Job, JobClassType } from "./job/job";
export type { JobBuilder } from "./job/job-builder";
