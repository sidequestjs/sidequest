import { Backend, createBackendFromDriver } from "@sidequest/backend";
import { logger } from "@sidequest/core";
import express from "express";
import basicAuth from "express-basic-auth";
import expressLayouts from "express-ejs-layouts";
import morgan from "morgan";
import { Server } from "node:http";
import path from "node:path";
import { DashboardConfig } from "./config";
import { createDashboardRouter } from "./resources/dashboard";
import { createJobsRouter } from "./resources/jobs";
import { createQueuesRouter } from "./resources/queues";

/**
 * A dashboard server for monitoring and managing Sidequest jobs and queues.
 *
 * The SidequestDashboard class provides a web-based interface for viewing job status,
 * queue information, and other Sidequest-related data. It sets up an Express.js server
 * with EJS templating, optional basic authentication, and connects to a configurable backend.
 *
 * @example
 * ```typescript
 * const dashboard = new SidequestDashboard();
 * await dashboard.start({
 *   port: 3000,
 *   enabled: true,
 *   auth: {
 *     user: 'admin',
 *     password: 'secret'
 *   },
 *   backendConfig: {
 *     driver: '@sidequest/sqlite-backend'
 *   }
 * });
 * ```
 */
export class SidequestDashboard {
  /**
   * The Express application instance used by the dashboard server.
   * This property is optional and may be undefined if the server has not been initialized.
   */
  private app?: express.Express;
  /**
   * Optional dashboard configuration object that defines the behavior and appearance
   * of the dashboard component. If not provided, default configuration will be used.
   */
  private config?: DashboardConfig;
  /**
   * The HTTP server instance used by the dashboard application.
   * This server handles incoming requests and serves the dashboard interface.
   * Will be undefined until the server is started.
   */
  private server?: Server;
  /**
   * Backend instance used for server communication and data operations.
   * When undefined, indicates that no backend connection has been established.
   */
  private backend?: Backend;

  constructor() {
    this.app = express();
  }

  /**
   * Starts the dashboard server with the provided configuration.
   *
   * @param config - Optional dashboard configuration object. If not provided, default values will be used.
   * @returns A promise that resolves when the server setup is complete.
   *
   * @remarks
   * - If the server is already running, a warning is logged and the method returns early
   * - If the dashboard is disabled in config, a debug message is logged and the method returns early
   * - The method sets up the Express app, backend driver, middlewares, authentication, EJS templating, routes, and starts listening
   *
   * @example
   * ```typescript
   * await dashboard.start({
   *   enabled: true,
   *   port: 3000,
   *   backendConfig: { driver: "@sidequest/sqlite-backend" }
   * });
   * ```
   */
  async start(config?: DashboardConfig) {
    if (this.server?.listening) {
      logger("Dashboard").warn("Dashboard is already running. Please stop it before starting again.");
      return;
    }

    this.config = {
      enabled: true,
      backendConfig: {
        driver: "@sidequest/sqlite-backend",
      },
      port: 8678,
      ...config,
    };

    if (!this.config.enabled) {
      logger("Dashboard").debug(`Dashboard is disabled`);
      return;
    }

    this.app ??= express();
    this.backend = await createBackendFromDriver(this.config.backendConfig!);

    this.setupMiddlewares();
    this.setupAuth();
    this.setupEJS();
    this.setupRoutes();

    this.listen();
  }

  /**
   * Sets up middleware for the Express application.
   *
   * Configures HTTP request logging using Morgan middleware when debug logging is enabled.
   * The middleware uses the "combined" format for comprehensive request logging.
   *
   * @remarks
   * - Only adds Morgan logging middleware when debug mode is active
   * - Uses Apache combined log format for detailed request information
   * - Logs are handled through the Dashboard logger instance
   */
  setupMiddlewares() {
    logger("Dashboard").debug(`Setting up Middlewares`);
    if (logger().isDebugEnabled()) {
      this.app?.use(morgan("combined"));
    }
  }

  /**
   * Sets up basic authentication for the dashboard application.
   *
   * If authentication configuration is provided, this method configures
   * HTTP Basic Authentication middleware using the specified username and password.
   * The middleware will challenge unauthorized requests with a 401 response.
   *
   * @remarks
   * - Only sets up authentication if `this.config.auth` is defined
   * - Uses a single user/password combination from the configuration
   * - Enables challenge mode to prompt for credentials in browsers
   *
   * @example
   * ```typescript
   * // Assuming config.auth = { user: "admin", password: "secret" }
   * dashboard.setupAuth(); // Sets up basic auth for user "admin"
   * ```
   */
  setupAuth() {
    if (this.config!.auth) {
      const auth = this.config!.auth;
      logger("Dashboard").debug(`Basic auth setup with User: ${auth.user}`);
      const users = {};
      users[auth.user] = auth.password;
      this.app!.use(
        basicAuth({
          users: users,
          challenge: true,
        }),
      );
    }
  }

  /**
   * Sets up EJS templating engine for the dashboard application.
   * This method configures the Express application to use EJS as the view engine,
   * sets the views directory, and specifies the layout file.
   *
   * @remarks
   * - Uses `express-ejs-layouts` for layout support
   * - Sets the views directory to the `views` folder within the package
   * - Serves static files from the `public` directory
   * - Ensures that the EJS engine is ready to render views with layouts
   */
  setupEJS() {
    logger("Dashboard").debug(`Setting up EJS`);
    this.app!.use(expressLayouts);
    this.app!.set("view engine", "ejs");
    this.app!.set("views", path.join(import.meta.dirname, "views"));
    this.app!.set("layout", path.join(import.meta.dirname, "views", "layout"));
    this.app!.use("/public", express.static(path.join(import.meta.dirname, "public")));
  }

  /**
   * Sets up the main application routes for the dashboard.
   *
   * This method initializes and attaches the dashboard, jobs, and queues routers
   * to the Express application instance. It also logs the setup process for debugging purposes.
   *
   * @remarks
   * - Assumes that `this.app` and `this.backend` are initialized.
   * - Uses the routers created by `createDashboardRouter`, `createJobsRouter`, and `createQueuesRouter`.
   */
  setupRoutes() {
    logger("Dashboard").debug(`Setting up routes`);
    this.app!.use(...createDashboardRouter(this.backend!));
    this.app!.use(...createJobsRouter(this.backend!));
    this.app!.use(...createQueuesRouter(this.backend!));
  }

  /**
   * Starts the dashboard server on the configured port.
   * Logs the startup process and handles any errors that occur during server initialization.
   *
   * @remarks
   * If no port is specified in the configuration, the default port 8678 is used.
   *
   * @returns void
   */
  listen() {
    const port = this.config!.port ?? 8678;
    logger("Dashboard").debug(`Starting Dashboard with port ${port}`);
    this.server = this.app!.listen(port, (error) => {
      if (error) {
        logger("Dashboard").error("Failed to start Sidequest Dashboard!", error);
      } else {
        logger("Dashboard").info(`Server running on http://localhost:${port}`);
      }
    });
  }

  /**
   * Closes the dashboard by shutting down the backend and server,
   * and cleaning up associated resources.
   *
   * - Awaits the closure of the backend if it exists.
   * - Closes the server and logs a message when stopped.
   * - Resets backend, server, config, and app properties to `undefined`.
   * - Logs a debug message indicating resources have been cleaned up.
   *
   * @returns {Promise<void>} Resolves when all resources have been closed and cleaned up.
   */
  async close() {
    await this.backend?.close();
    await new Promise<void>((resolve) => {
      this.server?.close(() => {
        logger("Dashboard").info("Sidequest Dashboard stopped");
        resolve();
      });
    });

    this.backend = undefined;
    this.server = undefined;
    this.config = undefined;
    this.app = undefined;
    logger("Dashboard").debug("Dashboard resources cleaned up");
  }
}

export * from "./config";
