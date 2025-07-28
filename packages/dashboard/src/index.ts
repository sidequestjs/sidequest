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

export class SidequestDashboard {
  private app?: express.Express;
  private config?: DashboardConfig;
  private server?: Server;
  private backend?: Backend;

  constructor() {
    this.app = express();
  }

  async start(config?: DashboardConfig) {
    this.app ??= express();
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

    this.backend = await createBackendFromDriver(this.config.backendConfig!);

    this.setupMiddlewares();
    this.setupAuth();
    this.setupEJS();
    this.setupRoutes();

    this.listen();
  }

  setupMiddlewares() {
    logger("Dashboard").debug(`Setting up Middlewares`);
    if (logger().isDebugEnabled()) {
      this.app?.use(morgan("combined"));
    }
  }

  setupAuth(config?: DashboardConfig) {
    if (config?.auth) {
      const auth = config.auth;
      logger("Dashboard").debug(`Basic auth setup with User: ${auth.user}`);
      const users = {};
      users[auth.user] = auth.password;
      this.app?.use(
        basicAuth({
          users: users,
          challenge: true,
        }),
      );
    }
  }

  setupEJS() {
    logger("Dashboard").debug(`Setting up EJS`);
    this.app!.use(expressLayouts);
    this.app!.set("view engine", "ejs");
    this.app!.set("views", path.join(import.meta.dirname, "views"));
    this.app!.set("layout", path.join(import.meta.dirname, "views", "layout"));
    this.app!.use("/public", express.static(path.join(import.meta.dirname, "public")));
  }

  setupRoutes() {
    logger("Dashboard").debug(`Setting up routes`);
    this.app!.use(...createDashboardRouter(this.backend!));
    this.app!.use(...createJobsRouter(this.backend!));
    this.app!.use(...createQueuesRouter(this.backend!));
  }

  listen() {
    const port = this.config?.port ?? 8678;
    logger("Dashboard").debug(`Starting Dashboard with port ${port}`);
    this.server = this.app!.listen(port, (error) => {
      if (error) {
        logger("Dashboard").error("Failed to start Sidequest Dashboard!", error);
      } else {
        logger("Dashboard").info(`Server running on http://localhost:${port}`);
      }
    });
  }

  async close() {
    await this.backend?.close();
    this.server?.close(() => {
      logger("Dashboard").info("Sidequest Dashboard stopped");
    });

    this.backend = undefined;
    this.server = undefined;
    this.config = undefined;
    this.app = undefined;
    logger("Dashboard").debug("Dashboard resources cleaned up");
  }
}

export * from "./config";
