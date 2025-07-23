import { logger } from "@sidequest/core";

let shuttingDown = false;

async function shutdown(fn: () => void | Promise<void>, tag: string, signal: string) {
  try {
    if (!shuttingDown) {
      shuttingDown = true;
      logger().info(`[${tag}] Received ${signal}. Shutting down gracefully...`);
      await fn();
    } else {
      logger().info(`[${tag}] Received ${signal} while already shutting down. Forcing shutdown.`);
    }
    logger().info(`[${tag}] Shutdown complete.`);
    process.exit(0);
  } catch (error) {
    logger().error(`[${tag}] Error during shutdown:`, error);
    process.exit(1);
  }
}

/* eslint-disable @typescript-eslint/no-misused-promises */
export function gracefulShutdown(fn: () => void | Promise<void>, tag: string) {
  process.on("SIGINT", async () => {
    await shutdown(fn, tag, "SIGINT");
  });

  process.on("SIGTERM", async () => {
    await shutdown(fn, tag, "SIGTERM");
  });
}
