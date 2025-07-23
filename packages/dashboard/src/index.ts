import { logger } from "@sidequest/core";
import express from "express";
import basicAuth from "express-basic-auth";
import expressLayouts from "express-ejs-layouts";
import morgan from "morgan";
import { Server } from "node:http";
import path from "node:path";
import { initBackend } from "./backend-driver";
import { DashboardConfig } from "./config";
import dashboardRouter from "./resources/dashboard";
import jobsRouter from "./resources/jobs";
import queuesRouter from "./resources/queues";

export class SidequestDashboard {
  private app: express.Express;
  private config?: DashboardConfig;
  private server?: Server;

  constructor() {
    this.app = express();
  }

  async start(config?: DashboardConfig) {
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

    await initBackend(this.config.backendConfig!);

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
    this.app?.use(expressLayouts);
    this.app?.set("view engine", "ejs");
    this.app?.set("views", path.join(import.meta.dirname, "views"));
    this.app?.set("layout", path.join(import.meta.dirname, "views", "layout"));
    this.app?.use("/public", express.static(path.join(import.meta.dirname, "public")));
  }

  setupRoutes() {
    logger("Dashboard").debug(`Setting up routes`);
    this.app?.use("/", dashboardRouter);
    this.app?.use("/jobs", jobsRouter);
    this.app?.use("/queues", queuesRouter);
  }

  listen() {
    const port = this.config?.port ?? 8678;
    logger("Dashboard").debug(`Starting Dashboard with port ${port}`);
    this.server = this.app?.listen(port, (error) => {
      if (error) {
        logger("Dashboard").error("Failed to start Sidequest Dashboard!", error);
      } else {
        logger("Dashboard").info(`Server running on http://localhost:${port}`);
      }
    });
  }

  close() {
    this.server?.close(() => {
      logger("Dashboard").info("Sidequest Dashboard stopped");
    });
    this.server = undefined;
    this.config = undefined;
  }
}

export * from "./config";
