import { logger } from "@sidequest/core";
import express from "express";
import basicAuth from "express-basic-auth";
import expressLayouts from "express-ejs-layouts";
import path from "node:path";
import { initBackend } from "./backend-driver";
import { DashboardConfig } from "./config";
import jobsRouter from "./resources/jobs";
import queuesRouter from "./resources/queues";
import dashboardRouter from "./resources/dashboard";

export class SidequestDashboard {
  static async start(config?: DashboardConfig) {
    const _config = {
      enabled: true,
      backendConfig: {
        driver: "@sidequest/sqlite-backend",
      },
      ...config,
    };

    if (!_config.enabled) return;

    await initBackend(_config.backendConfig);

    const app = express();

    this.setupAuth(app, _config);
    this.setupEJS(app);
    this.setupRoutes(app);

    this.listen(app, _config);
  }

  static setupAuth(app: express.Express, config?: DashboardConfig) {
    if (config?.auth) {
      const auth = config.auth;
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
    app.use(expressLayouts);
    app.set("view engine", "ejs");
    app.set("views", path.join(import.meta.dirname, "views"));
    app.set("layout", path.join(import.meta.dirname, "views", "layout"));
    app.use("/public", express.static(path.join(import.meta.dirname, "public")));
  }

  static setupRoutes(app: express.Express) {
    app.use("/", dashboardRouter);
    app.use("/jobs", jobsRouter);
    app.use("/queues", queuesRouter);
  }

  static listen(app: express.Express, config?: DashboardConfig) {
    const port = config?.port ?? 8678;
    app.listen(port, (error) => {
      if (error) {
        logger().error("Failed to start Sidequest Dashboard!", error);
      } else {
        logger().info(`Server running on http://localhost:${port}`);
      }
    });
  }
}

export * from "./config";
