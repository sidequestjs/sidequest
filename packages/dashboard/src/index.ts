import { logger } from "@sidequest/core";
import express from "express";
import basicAuth from "express-basic-auth";
import expressLayouts from "express-ejs-layouts";
import path from "node:path";
import { DashboardConfig } from "./config";
import jobsRouter from "./resources/jobs";
import queuesRouter from "./resources/queues";

export class SidequestDashboard {
  static start(config?: DashboardConfig) {
    const enabled = config?.enabled ?? true;
    if (!enabled) return;

    const app = express();

    this.setupAuth(app, config);
    this.setupEJS(app);
    this.setupHomepage(app);
    this.setupRoutes(app);

    this.listen(app, config);
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

  static setupHomepage(app: express.Express) {
    app.get("/", function (req, res) {
      res.render("pages/index", { title: "Sidequest Dashboard" });
    });
  }

  static setupRoutes(app: express.Express) {
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
