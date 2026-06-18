import { BackendConfig, LazyBackend, MISC_FALLBACK, NewQueueData, QUEUE_FALLBACK } from "@sidequest/backend";
import { configureLogger, JobClassType, logger, LoggerOptions } from "@sidequest/core";
import { ChildProcess, fork } from "child_process";
import { existsSync } from "fs";
import { cpus } from "os";
import { fileURLToPath } from "url";
import { inspect } from "util";
import { DEFAULT_WORKER_PATH, WORKER_PROCESS_FLAG } from "./constants";
import { Dependency, dependencyRegistry } from "./dependency-registry";
import { JOB_BUILDER_FALLBACK } from "./job/constants";
import { ScheduledJobRegistry } from "./job/cron-registry";
import { JobBuilder, JobBuilderDefaults } from "./job/job-builder";
import { grantQueueConfig, QueueDefaults } from "./queue/grant-queue-config";
import { findSidequestJobsScriptInParentDirs, resolveScriptPath } from "./shared-runner";
import { clearGracefulShutdown, gracefulShutdown } from "./utils/shutdown";
import { WorkerRuntime } from "./workers/worker-runtime";

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
  /**
   * Whether to run the engine in a forked child process.
   *
   * - `true` (default): the engine runs in a `child_process.fork`, isolating job-code crashes from
   *   the host application.
   * - `false`: the engine runs in the host process. A crash in job code can take down the host, but
   *   jobs can reach live in-process state. Useful for single-process setups (serverless, tests)
   *   and required by framework integrations that rely on in-process execution.
   *
   * Defaults to `true`.
   */
  fork?: boolean;
  /**
   * How jobs are executed.
   *
   * - `"thread"` (default): jobs run in a pool of worker threads (piscina). Gives CPU isolation
   *   and lets timeouts/cancellation forcibly abort a running job.
   * - `"inline"`: jobs run in the current process/thread, with no worker pool. Timeouts and
   *   cancellation become best-effort (a running job cannot be forcibly aborted) and a CPU-bound
   *   job will block the event loop. Useful for single-process setups (serverless, tests, SQLite)
   *   and required when jobs need access to live in-process state.
   *
   * Defaults to `"thread"`.
   */
  runner?: "thread" | "inline";
  /** Minimum number of worker threads to use. Defaults to number of CPUs */
  minThreads?: number;
  /** Maximum number of worker threads to use. Defaults to `minThreads * 2` */
  maxThreads?: number;
  /** Timeout in milliseconds for idle workers before they are terminated. Defaults to 10 seconds */
  idleWorkerTimeout?: number;
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
  /**
   * If true, job scripts will NOT be automatically resolved by the engine.
   * In this case, you need to create a `sidequest.jobs.js` file at the root of your project
   * (and at the root of any other project that uses Sidequest, like a worker) that imports and
   * exports all job classes.
   *
   * This allows you to control exactly which job classes are available to Sidequest,
   * and can also solve issues with module resolution in certain environments.
   *
   * Defaults to `false`.
   */
  manualJobResolution?: boolean;
  /**
   * Optional path to the `sidequest.jobs.js` file when using manual job resolution.
   * If not provided, the engine will search for `sidequest.jobs.js` starting from the current working directory
   * and walking up through parent directories until it finds the file or reaches the root.
   *
   * This is useful if your `sidequest.jobs.js` file is located in a non-standard location
   * or if you want to explicitly specify its path.
   *
   * This option will be resolved and changed at configuration time, and if the file does not exist,
   * an error will be thrown.
   *
   * IMPORTANT: if a relative path is provided, it will be resolved relative to the file calling the engine or
   * `Sidequest.configure()`, NOT the current working directory.
   *
   * If manualJobResolution === false, this option is ignored.
   */
  jobsFilePath?: string;
  /**
   * Interval in milliseconds for polling new jobs in the dispatcher loop.
   * The dispatcher will check for new jobs in the DB to process at every polling cycle.
   *
   * Increase this number to reduce DB load at the cost of job start latency.
   * Decrease this number if you want to have lower latency at the cost of higher DB load.
   *
   * Defaults to 100 ms.
   */
  jobPollingInterval?: number;
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
   * Main worker process that runs the Sidequest engine.
   * This is created when the engine is started and handles job processing.
   */
  private mainWorker?: ChildProcess;

  /**
   * Worker runtime when the engine runs in-process (`fork: false`).
   * Mutually exclusive with {@link mainWorker}.
   */
  private inProcessRuntime?: WorkerRuntime;

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
    if (this.getConfig()) {
      logger("Engine").debug("Sidequest already configured");
      return this.getConfig()!;
    }
    const nonNullConfig: NonNullableEngineConfig = {
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
      fork: config?.fork ?? true,
      runner: config?.runner ?? "thread",
      minThreads: config?.minThreads ?? cpus().length,
      maxThreads: config?.maxThreads ?? cpus().length * 2,
      idleWorkerTimeout: config?.idleWorkerTimeout ?? 10_000,
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
        backoffStrategy: config?.jobDefaults?.backoffStrategy ?? JOB_BUILDER_FALLBACK.backoffStrategy!,
        retryDelay: config?.jobDefaults?.retryDelay ?? JOB_BUILDER_FALLBACK.retryDelay!,
        scheduleOptions: config?.jobDefaults?.scheduleOptions ?? JOB_BUILDER_FALLBACK.scheduleOptions!,
      },
      queueDefaults: {
        concurrency: config?.queueDefaults?.concurrency ?? QUEUE_FALLBACK.concurrency,
        priority: config?.queueDefaults?.priority ?? QUEUE_FALLBACK.priority,
        state: config?.queueDefaults?.state ?? QUEUE_FALLBACK.state,
      },
      manualJobResolution: config?.manualJobResolution ?? false,
      jobsFilePath: config?.jobsFilePath?.trim() ?? "",
      jobPollingInterval: config?.jobPollingInterval ?? 100,
    };
    dependencyRegistry.register(Dependency.Config, nonNullConfig);

    this.validateConfig();

    logger("Engine").debug(`Configuring Sidequest engine: ${inspect(nonNullConfig)}`);

    if (nonNullConfig.logger) {
      configureLogger(nonNullConfig.logger);
    }

    const backend = dependencyRegistry.register(Dependency.Backend, new LazyBackend(nonNullConfig.backend));
    if (!nonNullConfig.skipMigration) {
      await backend.migrate();
    }

    return nonNullConfig;
  }

  /**
   * Validates the engine configuration settings.
   *
   * This method also resolves the jobs file path to a file URL if manual job resolution is enabled.
   *
   * @throws {Error} When `maxConcurrentJobs` is defined but less than 1
   * @throws {Error} When `manualJobResolution` is enabled but the specified `jobsFilePath` does not exist
   * @throws {Error} When `manualJobResolution` is enabled but no jobs script can be found in parent directories
   *
   * @remarks
   * - Ensures `maxConcurrentJobs` is at least 1 if specified
   * - When `manualJobResolution` is enabled, validates that either:
   *   - A valid `jobsFilePath` exists and resolves it to an absolute URL
   *   - A sidequest jobs script can be found in parent directories
   * - Logs the resolved jobs file path when using manual job resolution
   */
  validateConfig() {
    const config = this.getConfig();
    if (config!.maxConcurrentJobs !== undefined && config!.maxConcurrentJobs < 1) {
      throw new Error(`Invalid "maxConcurrentJobs" value: must be at least 1.`);
    }

    if (config!.manualJobResolution) {
      if (config!.jobsFilePath) {
        const scriptUrl = resolveScriptPath(config!.jobsFilePath);
        if (!existsSync(fileURLToPath(scriptUrl))) {
          throw new Error(`The specified jobsFilePath does not exist. Resolved to: ${scriptUrl}`);
        }
        logger("Engine").info(`Using manual jobs file at: ${config!.jobsFilePath}`);
        config!.jobsFilePath = scriptUrl;
      } else {
        // This should throw an error if not found
        findSidequestJobsScriptInParentDirs();
      }
    }
  }

  /**
   * Starts the Sidequest engine and worker process.
   * @param config Optional configuration object.
   */
  async start(config: EngineConfig): Promise<void> {
    if (this.mainWorker || this.inProcessRuntime) {
      logger("Engine").warn("Sidequest engine already started");
      return;
    }

    const nonNullConfig = await this.configure(config);

    logger("Engine").info(`Starting Sidequest using backend ${nonNullConfig.backend.driver}`);

    if (nonNullConfig.queues) {
      for (const queue of nonNullConfig.queues) {
        await grantQueueConfig(dependencyRegistry.get(Dependency.Backend)!, queue, nonNullConfig.queueDefaults, true);
      }
    }

    if (!nonNullConfig.fork) {
      logger("Engine").info("Starting Sidequest in-process (fork disabled)");
      this.inProcessRuntime = new WorkerRuntime(dependencyRegistry.get(Dependency.Backend)!, nonNullConfig);
      await this.inProcessRuntime.start();
      gracefulShutdown(this.close.bind(this), "Engine", nonNullConfig.gracefulShutdown);
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout on starting sidequest fork!"));
      }, 5000);

      if (!this.mainWorker) {
        const runWorker = () => {
          logger("Engine").debug("Starting main worker...");
          this.mainWorker = fork(DEFAULT_WORKER_PATH, [WORKER_PROCESS_FLAG]);
          logger("Engine").debug(`Worker PID: ${this.mainWorker.pid}`);
          this.mainWorker.on("message", (msg) => {
            if (msg === "ready") {
              logger("Engine").debug("Main worker is ready");
              this.mainWorker?.send({ type: "start", sidequestConfig: nonNullConfig });
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
        gracefulShutdown(this.close.bind(this), "Engine", nonNullConfig.gracefulShutdown);
      }
    });
  }

  /**
   * Gets the current engine configuration.
   * @returns The current configuration, if set.
   */
  getConfig() {
    return dependencyRegistry.get(Dependency.Config);
  }

  /**
   * Gets the backend instance in use by the engine.
   * @returns The backend instance, if set.
   */
  getBackend() {
    return dependencyRegistry.get(Dependency.Backend);
  }

  /**
   * Closes the engine and releases resources.
   */
  async close() {
    if (!this.shuttingDown) {
      this.shuttingDown = true;
      logger("Engine").debug("Closing Sidequest engine...");

      // Stop all scheduled cron jobs first
      await ScheduledJobRegistry.stopAll();

      if (this.mainWorker) {
        const promise = new Promise((resolve) => {
          this.mainWorker!.on("exit", resolve);
        });
        this.mainWorker.send({ type: "shutdown" });
        await promise;
      }
      if (this.inProcessRuntime) {
        await this.inProcessRuntime.shutdown();
      }
      try {
        await dependencyRegistry.get(Dependency.Backend)?.close();
      } catch (error) {
        logger("Engine").error("Error closing backend:", error);
      }
      this.mainWorker = undefined;
      this.inProcessRuntime = undefined;
      // Reset the shutting down flag after closing
      // This allows the engine to be reconfigured or restarted later
      clearGracefulShutdown();
      logger("Engine").debug("Sidequest engine closed.");
      this.shuttingDown = false;
      // Clear the dependency registry to allow fresh configuration later
      dependencyRegistry.clear();
    }
  }

  /**
   * Builds a job using the provided job class.
   * @param JobClass The job class constructor.
   * @returns A new JobBuilder instance for the job class.
   */
  build<T extends JobClassType>(JobClass: T) {
    const backend = this.getBackend();
    const config = this.getConfig();
    if (!config || !backend) {
      throw new Error("Engine not configured. Call engine.configure() or engine.start() first.");
    }
    if (this.shuttingDown) {
      throw new Error("Engine is shutting down, cannot build job.");
    }
    logger("Engine").debug(`Building job for class: ${JobClass.name}`);
    return new JobBuilder(
      backend,
      JobClass,
      {
        ...config.jobDefaults,
        // We need to do this check again because available at is a getter. It needs to be set at job creation time.
        // If not set, it will use the fallback value which is outdated from config.
        availableAt: config.jobDefaults.availableAt ?? JOB_BUILDER_FALLBACK.availableAt!,
      },
      config.manualJobResolution,
    );
  }
}
