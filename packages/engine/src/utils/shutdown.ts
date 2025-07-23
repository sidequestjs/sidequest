import { logger } from "@sidequest/core";

/* eslint-disable @typescript-eslint/no-misused-promises */
export function gracefulShutdown(fn: () => void | Promise<void>, tag: string) {
  process.on("SIGINT", async () => {
    logger().info(`[${tag}] Received SIGINT. Shutting down gracefully...`);
    try {
      await fn();
      logger().info(`[${tag}] Shutdown complete.`);
      process.exit(0);
    } catch (error) {
      logger().error(`[${tag}] Error during shutdown:`, error);
      process.exit(1);
    }
  });

  process.on("SIGTERM", async () => {
    logger().info(`[${tag}] Received SIGTERM. Shutting down gracefully...`);
    try {
      await fn();
      logger().info(`[${tag}] Shutdown complete.`);
      process.exit(0);
    } catch (error) {
      logger().error(`[${tag}] Error during shutdown:`, error);
      process.exit(1);
    }
  });
}
