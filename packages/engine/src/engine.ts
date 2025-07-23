import { Backend, configureLogger, logger, LoggerOptions, QueueConfig } from "@sidequest/core";
import { ChildProcess, fork } from "child_process";
import path from "path";
import { JobClassType } from "./job/job";
import { JobBuilder } from "./job/job-builder";
import { grantQueueConfig } from "./queue/grant-queue-config";

const workerPath = path.resolve(import.meta.dirname, "workers", "main.js");

let _backend: Backend;
let _config: SidequestConfig | undefined;
let _mainWorker: ChildProcess | undefined;

export interface BackendConfig {
  driver: "@sidequest/postgres-backend" | "@sidequest/sqlite-backend";
  config: unknown;
}

export interface SidequestConfig {
  backend?: BackendConfig;
  queues?: Record<string, QueueConfig>;
  logger?: LoggerOptions;
  maxConcurrentJobs?: number;
}

interface BackendModule {
  default: new (...args: unknown[]) => Backend;
}

export class Engine {
  static async configure(config?: SidequestConfig) {
    if (_config) {
      logger().warn("Sidequest already configured");
      return _config;
    }
    _config = config ?? { queues: {} };
    const driver = config?.backend?.driver ?? "@sidequest/sqlite-backend";
    const mod = (await import(driver)) as BackendModule;
    const BackendClass = mod.default;
    _backend = new BackendClass(config?.backend?.config);

    if (config?.logger) {
      configureLogger(config.logger);
    }
    await _backend.setup();
    if (_config.queues) {
      for (const queue of Object.keys(_config.queues)) {
        await grantQueueConfig(queue, _config.queues[queue]);
      }
    }

    return {
      ..._config,
      backend: {
        driver: driver,
        config: _config.backend?.config,
      },
    };
  }

  static async start(config?: SidequestConfig): Promise<void> {
    config = await Engine.configure(config);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("timeout on starting sidequest fork!"));
      }, 5000);

      if (!_mainWorker) {
        const runWorker = () => {
          _mainWorker = fork(workerPath);
          _mainWorker.on("message", (msg) => {
            if (msg === "ready") {
              _mainWorker?.send(config);
              clearTimeout(timeout);
              resolve();
            }
          });

          _mainWorker.on("exit", () => {
            logger().error("sidequest main exited, creating new...");
            runWorker();
          });
        };

        runWorker();
      }
    });
  }

  static getBackend() {
    return _backend;
  }

  static async getQueueConfig(queue: string): Promise<QueueConfig> {
    return _backend.getQueueConfig(queue);
  }

  static async close() {
    _config = undefined;
    return _backend.close();
  }

  static build(JobClass: JobClassType) {
    return new JobBuilder(JobClass);
  }
}

export { DeduplicationStrategy, DefaultDeduplicationStrategy } from "./deduplication";
export { Job, JobClassType } from "./job/job";
