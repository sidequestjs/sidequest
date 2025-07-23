import { logger } from "@sidequest/core";
import express from "express";
import basicAuth from "express-basic-auth";
import expressLayouts from "express-ejs-layouts";
import morgan from "morgan";
import path from "node:path";
import { initBackend } from "./backend-driver";
import { DashboardConfig } from "./config";
import dashboardRouter from "./resources/dashboard";
import jobsRouter from "./resources/jobs";
import queuesRouter from "./resources/queues";

export class SidequestDashboard {
  static async start(config?: DashboardConfig) {
    const _config = {
      enabled: true,
      backendConfig: {
        driver: "@sidequest/sqlite-backend",
      },
      port: 8678,
      ...config,
    };

    if (!_config.enabled) {
      logger("Dashboard").debug(`Dashboard is disabled`);
      return;
    }

    await initBackend(_config.backendConfig);

    const app = express();

    this.setupMiddlewares(app);
    this.setupAuth(app, _config);
    this.setupEJS(app);
    this.setupRoutes(app);

    this.listen(app, _config);
  }

  static setupMiddlewares(app: express.Express) {
    logger("Dashboard").debug(`Setting up Middlewares`);
    if (logger().isDebugEnabled()) {
      app.use(morgan("combined"));
    }
  }

  static setupAuth(app: express.Express, config?: DashboardConfig) {
    if (config?.auth) {
      const auth = config.auth;
      logger("Dashboard").debug(`Basic auth setup with User: ${auth.user}`);
      const users = {};
      users[auth.user] = auth.password;
      app.use(
        basicAuth({
          users: users,
          challenge: true,
        }),
      );
    }
  }

  static setupEJS(app: express.Express) {
    logger("Dashboard").debug(`Setting up EJS`);
    app.use(expressLayouts);
    app.set("view engine", "ejs");
    app.set("views", path.join(import.meta.dirname, "views"));
    app.set("layout", path.join(import.meta.dirname, "views", "layout"));
    app.use("/public", express.static(path.join(import.meta.dirname, "public")));
  }

  static setupRoutes(app: express.Express) {
    logger("Dashboard").debug(`Setting up routes`);
    app.use("/", dashboardRouter);
    app.use("/jobs", jobsRouter);
    app.use("/queues", queuesRouter);
  }

  static listen(app: express.Express, config: DashboardConfig) {
    const port = config.port!;
    logger("Dashboard").debug(`Starting Dashboard with port ${port}`);
    app.listen(port, (error) => {
      if (error) {
        logger("Dashboard").error("Failed to start Sidequest Dashboard!", error);
      } else {
        logger("Dashboard").info(`Server running on http://localhost:${port}`);
      }
    });
  }
}

export * from "./config";
