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

export interface SidequestConfig {
  backend?: BackendConfig;
  queues?: NewQueueData[];
  logger?: LoggerOptions;
  maxConcurrentJobs?: number;
}

export class Engine {
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

    await _backend.setup();
    if (_config.queues) {
      for (const queue of _config.queues) {
        await grantQueueConfig(queue.name, queue);
      }
    }

    return _config;
  }

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

  static getConfig() {
    return _config;
  }

  static getBackend() {
    return _backend;
  }

  static async getQueueConfig(queue: string): Promise<QueueConfig | undefined> {
    if (!_backend) throw new Error("Engine not configured. Call Engine.configure() or Engine.start() first.");
    return _backend.getQueueConfig(queue);
  }

  static async close() {
    _config = undefined;
    return _backend?.close();
  }

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
