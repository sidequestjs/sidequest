import { SQLDriverConfig } from "@sidequest/backend";
import { JobClassType, logger } from "@sidequest/core";
import { DashboardConfig, SidequestDashboard } from "@sidequest/dashboard";
import { Engine, EngineConfig } from "@sidequest/engine";
import { JobOperations } from "./job";
import { QueueOperations } from "./queue";

/**
 * Known backend driver identifiers
 */
type KnownSQLDrivers = "@sidequest/postgres-backend" | "@sidequest/mysql-backend" | "@sidequest/sqlite-backend";

/**
 * Known MongoDB driver identifier
 */
type KnownMongoDriver = "@sidequest/mongo-backend";

/**
 * All known backend driver identifiers
 */
type KnownDrivers = KnownSQLDrivers | KnownMongoDriver;

/**
 * Strongly typed backend configuration that automatically infers config type based on driver
 */
export type StronglyTypedBackendConfig<TDriver extends string = KnownDrivers> = TDriver extends KnownSQLDrivers
  ? {
      /** SQL backend driver identifier */
      driver: TDriver;
      /** Database configuration - can be a connection string or detailed config object */
      config: string | SQLDriverConfig;
    }
  : TDriver extends KnownMongoDriver
    ? {
        /** MongoDB backend driver identifier */
        driver: TDriver;
        /** MongoDB connection string */
        config: string;
      }
    : {
        /** Custom backend driver identifier */
        driver: TDriver;
        /** Custom configuration - type is unknown for flexibility */
        config: unknown;
      };

/**
 * Sidequest engine configuration with strongly typed backend
 */
export type SidequestEngineConfig<TDriver extends string = KnownDrivers> = Omit<EngineConfig, "backend"> & {
  /** Backend configuration with driver-specific typing */
  backend: StronglyTypedBackendConfig<TDriver>;
};

/**
 * Complete Sidequest configuration
 */
export type SidequestConfig<TDriver extends string = KnownDrivers> = SidequestEngineConfig<TDriver> & {
  /** Optional dashboard configuration */
  dashboard?: Omit<DashboardConfig, "backendConfig">;
};

/**
 * Main entry point for the Sidequest job processing system.
 *
 * The Sidequest class provides static methods to configure, start, and build jobs
 * within the Sidequest ecosystem. It serves as a high-level interface that coordinates
 * the underlying Engine and Dashboard components.
 *
 * @example
 * ```typescript
 * // Configure and start Sidequest with dashboard
 * const engine = await Sidequest.start({
 *   // engine configuration
 *   dashboard: {
 *     // dashboard configuration
 *   }
 * });
 *
 * // Build and execute a job
 * const jobBuilder = Sidequest.build(MyJobClass);
 * ```
 */
export class Sidequest {
  /**
   * Static reference to the Engine instance used by Sidequest.
   * This allows access to the underlying engine for advanced operations.
   */
  private static engine = new Engine();

  /**
   * Static reference to the SidequestDashboard instance.
   * This provides access to the dashboard for monitoring and managing jobs and queues.
   */
  private static dashboard = new SidequestDashboard();

  /**
   * Provides access to the singleton QueueOperations instance for managing queues.
   *
   * @example
   * ```typescript
   * const updatedQueue = await Sidequest.queue.pauseQueue("default");
   * ```
   */
  static readonly queue = QueueOperations.instance;

  /**
   * Static reference to the JobOperations singleton instance.
   * Provides access to job-related operations and management functionality.
   *
   * @example
   * ```typescript
   * const jobData = Sidequest.job.get(jobId);
   * ```
   */
  static readonly job = JobOperations.instance;

  /**
   * Configures the Sidequest engine system with the provided configuration options.
   * This method only initializes the engine and does not start the engine or dashboard.
   * It is useful for when you want to set up the configuration without starting the job processing.
   *
   * @param config - Optional configuration object to customize Sidequest behavior
   * @returns A Promise that resolves when the configuration is complete
   *
   * @example
   * ```typescript
   * await Sidequest.configure({
   *   // configuration options
   * });
   * ```
   */
  static async configure<TDriver extends string = KnownDrivers>(config?: SidequestEngineConfig<TDriver>) {
    const _config = await this.engine.configure(config);
    const backend = this.engine.getBackend();
    this.job.setBackend(backend);
    this.queue.setBackend(backend);
    return _config;
  }

  /**
   * Starts the Sidequest engine and dashboard with the provided configuration.
   *
   * @param config - Optional configuration object that includes engine settings and dashboard configuration
   * @param config.dashboard - Dashboard-specific configuration, excluding backendConfig which is automatically provided
   * based on the engine configuration.
   * @returns A promise that resolves when the engine and dashboard are fully started.
   *
   * @example
   * ```typescript
   * const engine = await Sidequest.start({
   *   // engine config...
   *   dashboard: {
   *     port: 3000,
   *     // other dashboard options...
   *   }
   * });
   * ```
   */
  static async start<TDriver extends string = KnownDrivers>(config?: SidequestConfig<TDriver>) {
    try {
      const engineConfig = await this.configure(config);

      const engine = this.engine.start(engineConfig);
      const dashboard = this.dashboard.start({ ...config?.dashboard, backendConfig: engineConfig.backend });

      await engine;
      await dashboard;
    } catch (error) {
      logger().error("Failed to start Sidequest:", error);
      await this.stop(); // Ensure cleanup on error
      throw error; // Re-throw the error for further handling if needed
    }
  }

  /**
   * Stops the SideQuest instance by closing all active components.
   *
   * This method performs cleanup operations including:
   * - Closing the engine
   * - Clearing the job backend
   * - Clearing the queue backend
   * - Closing the dashboard
   *
   * @returns A promise that resolves when all cleanup operations are complete
   */
  static async stop() {
    await this.engine.close();
    this.job.setBackend(undefined);
    this.queue.setBackend(undefined);
    await this.dashboard.close();
  }

  /**
   * Builds a job class using a JobBuilder.
   *
   * @param JobClass The job class constructor.
   * @returns a JobBuilder that can be used to chain parameters and other job configurations.
   */
  static build<T extends JobClassType>(JobClass: T) {
    return this.engine.build(JobClass);
  }

  /**
   * Gets the backend instance from the Sidequest engine.
   * This is useful for advanced operations that require direct access to the backend.
   *
   * @returns The backend instance.
   * @throws Error if the engine is not configured.
   */
  static getBackend() {
    return this.engine.getBackend();
  }
}
