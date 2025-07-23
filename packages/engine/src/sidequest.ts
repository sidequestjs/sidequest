import { Backend, configureLogger, logger, LoggerOptions, QueueConfig } from "@sidequest/core";
import { ChildProcess, fork } from "child_process";
import path from "path";
import { grantQueueConfig } from "./queue/grant-queue-config";

import { runWeb } from "./web/app";

const workerPath = path.resolve(import.meta.dirname, "workers", "main.js");

let _backend: Backend;
let _config: SidequestConfig;
let _mainWorker: ChildProcess | undefined;

export type BackEndConfig = {
  driver: "@sidequest/postgres-backend" | "@sidequest/sqlite-backend";
  config: any;
};

export type SidequestConfig = {
  backend?: BackEndConfig;
  queues?: Map<string, QueueConfig>;
  logger?: LoggerOptions;
  maxConcurrentJobs?: number;
};

export class Sidequest {
  static async configure(config?: SidequestConfig) {
    if (_config) {
      logger().warn("Sidequest already configured");
      return;
    }
    _config = config || { queues: new Map<string, QueueConfig>() };
    const driver = config?.backend?.driver ?? "@sidequest/sqlite-backend";
    const mod = await import(driver);
    const BackendClass = mod.default;
    _backend = new BackendClass(config?.backend?.config);

    if (config?.logger) {
      configureLogger(config.logger);
    }
    await _backend.setup();
    if (_config.queues) {
      for (let queue of Object.keys(_config.queues)) {
        await grantQueueConfig(queue, _config.queues[queue]);
      }
    }
  }

  static async start(config: SidequestConfig): Promise<void> {
    await Sidequest.configure(config);

    return new Promise(async (resolve, reject) => {
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

      runWeb();
    });
  }

  static getBackend() {
    return _backend;
  }

  static async getQueueConfig(queue: string): Promise<QueueConfig> {
    return _backend.getQueueConfig(queue);
  }
}

export { Backend, JobData, LoggerOptions, QueueConfig } from "@sidequest/core";
export { Job } from "./job/job";
