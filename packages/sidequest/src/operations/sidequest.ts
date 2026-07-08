import type { Backend } from "@sidequest/backend";
import { JobClassType, logger } from "@sidequest/core";
import { Engine } from "@sidequest/engine";
import { JobOperations } from "./job";
import { QueueOperations } from "./queue";
import { DashboardConfig, KnownDrivers, SidequestConfig, SidequestEngineConfig } from "./types";

/**
 * Main entry point for the Sidequest job processing system.
 *
 * The Sidequest class provides static methods to configure, start, and build jobs
 * within the Sidequest ecosystem. It serves as a high-level interface over the
 * underlying Engine.
 *
 * @example
 * ```typescript
 * // Configure and start Sidequest
 * await Sidequest.start({
 *   // engine configuration
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

  /** Handle to the running dashboard server, when booted via `start({ dashboard })`. */
  private static dashboardServer?: { close: () => Promise<void> };

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
   * Starts the Sidequest engine with the provided configuration.
   *
   * @param config - Optional configuration object with engine settings.
   * @returns A promise that resolves when the engine is fully started.
   *
   * @example
   * ```typescript
   * await Sidequest.start({
   *   // engine config...
   * });
   * ```
   */
  static async start<TDriver extends string = KnownDrivers>(config?: SidequestConfig<TDriver>) {
    try {
      const engineConfig = await this.configure(config);

      await this.engine.start(engineConfig);

      if (config?.dashboard?.enabled) {
        const driver = (engineConfig as { backend?: { driver?: string } }).backend?.driver;
        await this.startDashboard(config.dashboard, driver);
      }
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
   *
   * @returns A promise that resolves when all cleanup operations are complete
   */
  static async stop() {
    if (this.dashboardServer) {
      await this.dashboardServer.close();
      this.dashboardServer = undefined;
    }
    await this.engine.close();
    this.job.setBackend(undefined);
    this.queue.setBackend(undefined);
  }

  /**
   * Boots the `@sidequest/web` dashboard façade alongside the engine, serving the SPA and
   * the management API on `dashboard.port`. Loaded lazily via a dynamic import so
   * `@sidequest/web` is only touched when the dashboard is enabled.
   */
  private static async startDashboard(dashboard: DashboardConfig, driver?: string): Promise<void> {
    interface WebServer {
      serveDashboard(options: {
        backend: Backend;
        driver?: string;
        port?: number;
        basePath?: string;
        auth?: { user: string; password: string };
      }): { close: () => Promise<void> };
    }
    const backend = this.getBackend();
    if (!backend) {
      throw new Error("Cannot start the dashboard before the engine backend is ready.");
    }
    try {
      const specifier = "@sidequest/web/server";
      const web = (await import(specifier)) as WebServer;
      this.dashboardServer = web.serveDashboard({
        backend,
        driver,
        port: dashboard.port,
        basePath: dashboard.basePath,
        auth: dashboard.auth,
      });
      logger().info(`Sidequest dashboard listening on port ${dashboard.port ?? 8678}`);
    } catch (error) {
      logger().error("Failed to start the Sidequest dashboard. Is @sidequest/web installed?", error);
      throw error;
    }
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
