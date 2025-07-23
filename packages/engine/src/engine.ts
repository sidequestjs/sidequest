import {
  Backend,
  BackendConfig,
  createBackendFromDriver,
  MISC_FALLBACK,
  NewQueueData,
  QUEUE_FALLBACK,
} from "@sidequest/backend";
import { configureLogger, logger, LoggerOptions, QueueConfig } from "@sidequest/core";
import { ChildProcess, fork } from "child_process";
import { cpus } from "os";
import path from "path";
import { JOB_BUILDER_FALLBACK } from "./job/constants";
import { JobClassType } from "./job/job";
import { JobBuilder, JobBuilderDefaults } from "./job/job-builder";
import { grantQueueConfig, QueueDefaults } from "./queue/grant-queue-config";
import { gracefulShutdown } from "./utils/shutdown";

const workerPath = path.resolve(import.meta.dirname, "workers", "main.js");

let _backend: Backend | undefined;
let _config: NonNullableSidequestConfig | undefined;
let _mainWorker: ChildProcess | undefined;
let shuttingDown = false;

/**
 * Configuration options for the Sidequest engine.
 */
export interface SidequestConfig {
  /** Backend configuration. Defaults to `@sidequest/sqlite-backend` and `./sidequest.sqlite` file */
  backend?: BackendConfig;
  /** List of queue configurations. Defaults to `[]` */
  queues?: NewQueueData[];
  /** Logger configuration options. Defaults to `info` and no json */
  logger?: LoggerOptions;
  /** Maximum number of concurrent jobs. Defaults to `10` */
  maxConcurrentJobs?: number;
  /** Whether to skip migration when starting the engine. Defaults to `false` */
  skipMigration?: boolean;
  /** Frequency in minutes for releasing stale jobs. Set to false to disable. Defaults to 60 min */
  releaseStaleJobsIntervalMin?: number | false;
  /** Maximum age in milliseconds a running job must be to be considered a stale job. Defaults to 10 minutes */
  releaseStaleJobsMaxStaleMs?: number;
  /** Maximum age in milliseconds a claimed job must be to be considered stale. Defaults to 1 minute */
  releaseStaleJobsMaxClaimedMs?: number;
  /** Frequency in minutes for cleaning up finished jobs. Set to false to disable. Defaults to 60 min */
  cleanupFinishedJobsIntervalMin?: number | false;
  /** Time in milliseconds to clean up finished jobs older than this value. Defaults to 30 days */
  cleanupFinishedJobsOlderThan?: number;
  /** Whether to enable graceful shutdown handling. Defaults to `true` */
  gracefulShutdown?: boolean;
  /** Minimum number of worker threads to use. Defaults to number of CPUs */
  minThreads?: number;
  /** Maximum number of worker threads to use. Defaults to `minThreads * 2` */
  maxThreads?: number;

  /**
   * Default job builder configuration.
   * This allows setting default values for job properties like queue, timeout, uniqueness, etc.
   * If not provided during job build, defaults will be used.
   *
   * @see {@link JobBuilderDefaults} for more details
   */
  jobDefaults?: JobBuilderDefaults;

  /**
   * Default queue configuration.
   * This allows setting default values for queue properties like concurrency, priority, etc.
   * If not provided during queue creation, defaults will be used.
   *
   * @see {@link QueueDefaults} for more details
   */
  queueDefaults?: QueueDefaults;
}

/**
 * Non-nullable version of the SidequestConfig type.
 * Ensures all properties are defined and not null.
 *
 * @see {@link SidequestConfig} for the original type.
 */
export type NonNullableSidequestConfig = {
  [P in keyof SidequestConfig]-?: NonNullable<SidequestConfig[P]>;
};

/**
 * The main engine for managing job queues and workers in Sidequest.
 */
export class Engine {
  /**
   * Configures the Sidequest engine with the provided configuration.
   * @param config Optional configuration object.
   * @returns The resolved configuration.
   */
  static async configure(config?: SidequestConfig): Promise<NonNullableSidequestConfig> {
    if (_config) {
      logger("Engine").debug("Sidequest already configured");
      return _config;
    }
    _config = {
      queues: config?.queues ?? [],
      backend: {
        driver: config?.backend?.driver ?? "@sidequest/sqlite-backend",
        config: config?.backend?.config ?? "./sidequest.sqlite",
      },
      cleanupFinishedJobsIntervalMin: config?.cleanupFinishedJobsIntervalMin ?? 60,
      cleanupFinishedJobsOlderThan: config?.cleanupFinishedJobsOlderThan ?? 30 * 24 * 60 * 60 * 1000,
      releaseStaleJobsIntervalMin: config?.releaseStaleJobsIntervalMin ?? 60,
      maxConcurrentJobs: config?.maxConcurrentJobs ?? 10,
      skipMigration: config?.skipMigration ?? false,
      logger: {
        level: config?.logger?.level ?? "info",
        json: config?.logger?.json ?? false,
      },
      gracefulShutdown: config?.gracefulShutdown ?? true,
      minThreads: config?.minThreads ?? cpus().length,
      maxThreads: config?.maxThreads ?? cpus().length * 2,
      releaseStaleJobsMaxStaleMs: config?.releaseStaleJobsMaxStaleMs ?? MISC_FALLBACK.maxStaleMs, // 10 minutes
      releaseStaleJobsMaxClaimedMs: config?.releaseStaleJobsMaxClaimedMs ?? MISC_FALLBACK.maxClaimedMs, // 1 minute
      jobDefaults: {
        queue: config?.jobDefaults?.queue ?? JOB_BUILDER_FALLBACK.queue!,
        maxAttempts: config?.jobDefaults?.maxAttempts ?? JOB_BUILDER_FALLBACK.maxAttempts!,
        availableAt: config?.jobDefaults?.availableAt ?? JOB_BUILDER_FALLBACK.availableAt!,
        timeout: config?.jobDefaults?.timeout ?? JOB_BUILDER_FALLBACK.timeout!,
        uniqueness: config?.jobDefaults?.uniqueness ?? JOB_BUILDER_FALLBACK.uniqueness!,
      },
      queueDefaults: {
        concurrency: config?.queueDefaults?.concurrency ?? QUEUE_FALLBACK.concurrency,
        priority: config?.queueDefaults?.priority ?? QUEUE_FALLBACK.priority,
        state: config?.queueDefaults?.state ?? QUEUE_FALLBACK.state,
      },
    };

    if (_config.logger) {
      configureLogger(_config.logger);
    }

    logger("Engine").debug(`Configuring Sidequest engine: ${JSON.stringify(_config)}`);
    _backend = await createBackendFromDriver(_config.backend);

    if (!_config.skipMigration) {
      await _backend.migrate();
    }

    if (_config.queues) {
      for (const queue of _config.queues) {
        await grantQueueConfig(_backend, queue, _config.queueDefaults);
      }
    }

    return _config;
  }

  /**
   * Starts the Sidequest engine and worker process.
   * @param config Optional configuration object.
   */
  static async start(config: SidequestConfig): Promise<void> {
    config = await Engine.configure(config);

    logger("Engine").info(`Starting Sidequest using backend ${config.backend?.driver}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout on starting sidequest fork!"));
      }, 5000);

      if (!_mainWorker) {
        const runWorker = () => {
          logger("Engine").debug("Starting main worker...");
          _mainWorker = fork(workerPath);
          logger("Engine").debug(`Worker PID: ${_mainWorker.pid}`);
          _mainWorker.on("message", (msg) => {
            if (msg === "ready") {
              logger("Engine").debug("Main worker is ready");
              _mainWorker?.send({ type: "start", sidequestConfig: config });
              clearTimeout(timeout);
              resolve();
            }
          });

          _mainWorker.on("exit", () => {
            if (!shuttingDown) {
              logger("Engine").error("Sidequest main exited, creating new...");
              runWorker();
            }
          });
        };

        runWorker();

        gracefulShutdown(
          async () => {
            shuttingDown = true;
            if (_mainWorker) {
              _mainWorker.send({ type: "shutdown" });
              await new Promise((resolve) => {
                _mainWorker?.on("exit", resolve);
              });
            }
            await Engine.close();
          },
          "Engine",
          config.gracefulShutdown!,
        );
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
    logger("Engine").debug("Closing Sidequest engine...");
    _config = undefined;
    await _backend?.close();
    _backend = undefined;
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
    logger("Engine").debug(`Building job for class: ${JobClass.name}`);
    return new JobBuilder(JobClass, _config.jobDefaults);
  }
}

export { Job, JobClassType } from "./job/job";
export type { JobBuilder } from "./job/job-builder";
