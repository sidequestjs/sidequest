import {
  Backend,
  BackendConfig,
  createBackendFromDriver,
  MISC_FALLBACK,
  NewQueueData,
  QUEUE_FALLBACK,
} from "@sidequest/backend";
import { configureLogger, logger, LoggerOptions } from "@sidequest/core";
import { ChildProcess, fork } from "child_process";
import { cpus } from "os";
import path from "path";
import { JOB_BUILDER_FALLBACK } from "./job/constants";
import { JobClassType } from "./job/job";
import { JobBuilder, JobBuilderDefaults } from "./job/job-builder";
import { grantQueueConfig, QueueDefaults } from "./queue/grant-queue-config";
import { clearGracefulShutdown, gracefulShutdown } from "./utils/shutdown";

const workerPath = path.resolve(import.meta.dirname, "workers", "main.js");

/**
 * Configuration options for the Sidequest engine.
 */
export interface EngineConfig {
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
  /** Time in milliseconds to wait between dispatcher cycles when no jobs are available. Defaults to 1000 ms */
  idlePollingInterval?: number;
  /** Maximum number of jobs to claim from a single queue when concurrency is unlimited. Defaults to 10 */
  maxClaimedJobsByQueue?: number;

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
 * Non-nullable version of the EngineConfig type.
 * Ensures all properties are defined and not null.
 *
 * @see {@link EngineConfig} for the original type.
 */
export type NonNullableEngineConfig = {
  [P in keyof EngineConfig]-?: NonNullable<EngineConfig[P]>;
};

/**
 * The main engine for managing job queues and workers in Sidequest.
 */
export class Engine {
  /**
   * Backend instance used by the engine.
   * This is initialized when the engine is configured or started.
   */
  private backend?: Backend;

  /**
   * Current configuration of the engine.
   * This is set when the engine is configured or started.
   * It contains all the necessary settings for the engine to operate, such as backend, queues, logger options, and job defaults.
   */
  private config?: NonNullableEngineConfig;

  /**
   * Main worker process that runs the Sidequest engine.
   * This is created when the engine is started and handles job processing.
   */
  private mainWorker?: ChildProcess;

  /**
   * Flag indicating whether the engine is currently shutting down.
   * This is used to prevent multiple shutdown attempts and ensure graceful shutdown behavior.
   */
  private shuttingDown = false;

  /**
   * Configures the Sidequest engine with the provided configuration.
   * @param config Optional configuration object.
   * @returns The resolved configuration.
   */
  async configure(config?: EngineConfig): Promise<NonNullableEngineConfig> {
    if (this.config) {
      logger("Engine").debug("Sidequest already configured");
      return this.config;
    }
    this.config = {
      queues: config?.queues ?? [],
      backend: {
        driver: config?.backend?.driver ?? "@sidequest/sqlite-backend",
        config: config?.backend?.config ?? "./sidequest.sqlite",
      },
      cleanupFinishedJobsIntervalMin: config?.cleanupFinishedJobsIntervalMin ?? 60,
      cleanupFinishedJobsOlderThan: config?.cleanupFinishedJobsOlderThan ?? 30 * 24 * 60 * 60 * 1000,
      releaseStaleJobsIntervalMin: config?.releaseStaleJobsIntervalMin ?? 60,
      maxConcurrentJobs: config?.maxConcurrentJobs ?? 10,
      idlePollingInterval: config?.idlePollingInterval ?? 100,
      maxClaimedJobsByQueue: config?.maxClaimedJobsByQueue ?? 20,
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
        // This here does not use a fallback default because it is a getter.
        // It needs to be set at job creation time.
        availableAt: config?.jobDefaults?.availableAt,
        timeout: config?.jobDefaults?.timeout ?? JOB_BUILDER_FALLBACK.timeout!,
        uniqueness: config?.jobDefaults?.uniqueness ?? JOB_BUILDER_FALLBACK.uniqueness!,
      },
      queueDefaults: {
        concurrency: config?.queueDefaults?.concurrency ?? QUEUE_FALLBACK.concurrency,
        priority: config?.queueDefaults?.priority ?? QUEUE_FALLBACK.priority,
        state: config?.queueDefaults?.state ?? QUEUE_FALLBACK.state,
      },
    };

    if (this.config.logger) {
      configureLogger(this.config.logger);
    }

    logger("Engine").debug(`Configuring Sidequest engine: ${JSON.stringify(this.config)}`);
    this.backend = await createBackendFromDriver(this.config.backend);

    if (!this.config.skipMigration) {
      await this.backend.migrate();
    }

    if (this.config.queues) {
      for (const queue of this.config.queues) {
        await grantQueueConfig(this.backend, queue, this.config.queueDefaults, true);
      }
    }

    return this.config;
  }

  /**
   * Starts the Sidequest engine and worker process.
   * @param config Optional configuration object.
   */
  async start(config: EngineConfig): Promise<void> {
    await this.configure(config);

    logger("Engine").info(`Starting Sidequest using backend ${this.config!.backend.driver}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout on starting sidequest fork!"));
      }, 5000);

      if (!this.mainWorker) {
        const runWorker = () => {
          logger("Engine").debug("Starting main worker...");
          this.mainWorker = fork(workerPath);
          logger("Engine").debug(`Worker PID: ${this.mainWorker.pid}`);
          this.mainWorker.on("message", (msg) => {
            if (msg === "ready") {
              logger("Engine").debug("Main worker is ready");
              this.mainWorker?.send({ type: "start", sidequestConfig: this.config! });
              clearTimeout(timeout);
              resolve();
            }
          });

          this.mainWorker.on("exit", () => {
            if (!this.shuttingDown) {
              logger("Engine").error("Sidequest main exited, creating new...");
              runWorker();
            }
          });
        };

        runWorker();
        gracefulShutdown(this.close.bind(this), "Engine", this.config!.gracefulShutdown);
      }
    });
  }

  /**
   * Gets the current engine configuration.
   * @returns The current configuration, if set.
   */
  getConfig() {
    return this.config;
  }

  /**
   * Gets the backend instance in use by the engine.
   * @returns The backend instance, if set.
   */
  getBackend() {
    return this.backend;
  }

  /**
   * Closes the engine and releases resources.
   */
  async close() {
    if (!this.shuttingDown) {
      this.shuttingDown = true;
      logger("Engine").debug("Closing Sidequest engine...");
      if (this.mainWorker) {
        const promise = new Promise((resolve) => {
          this.mainWorker!.on("exit", resolve);
        });
        this.mainWorker.send({ type: "shutdown" });
        await promise;
      }
      await this.backend?.close();
      this.config = undefined;
      this.backend = undefined;
      this.mainWorker = undefined;
      // Reset the shutting down flag after closing
      // This allows the engine to be reconfigured or restarted later
      clearGracefulShutdown();
      logger("Engine").debug("Sidequest engine closed.");
      this.shuttingDown = false;
    }
  }

  /**
   * Builds a job using the provided job class.
   * @param JobClass The job class constructor.
   * @returns A new JobBuilder instance for the job class.
   */
  build<T extends JobClassType>(JobClass: T) {
    if (!this.config || !this.backend) {
      throw new Error("Engine not configured. Call engine.configure() or engine.start() first.");
    }
    if (this.shuttingDown) {
      throw new Error("Engine is shutting down, cannot build job.");
    }
    logger("Engine").debug(`Building job for class: ${JobClass.name}`);
    return new JobBuilder(this.backend, JobClass, {
      ...this.config.jobDefaults,
      // We need to do this check again because available at is a getter. It needs to be set at job creation time.
      // If not set, it will use the fallback value which is outdated from config.
      availableAt: this.config.jobDefaults.availableAt ?? JOB_BUILDER_FALLBACK.availableAt!,
    });
  }
}
