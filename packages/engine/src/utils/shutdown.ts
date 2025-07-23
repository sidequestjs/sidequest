import { logger } from "@sidequest/core";

let shuttingDown = false;

/**
 * Handles the shutdown process, ensuring it only runs once and logs appropriately.
 * @param fn The async function to run during shutdown.
 * @param tag A label for logging.
 * @param signal The signal that triggered shutdown.
 */
async function shutdown(fn: () => void | Promise<void>, tag: string, signal: string) {
  try {
    if (!shuttingDown) {
      shuttingDown = true;
      logger("Engine").info(`[${tag}] Received ${signal}. Shutting down gracefully...`);
      await fn();
    } else {
      logger("Engine").info(`[${tag}] Received ${signal} while already shutting down. Forcing shutdown.`);
    }
    logger("Engine").info(`[${tag}] Shutdown complete.`);
    process.exit(0);
  } catch (error) {
    logger("Engine").error(`[${tag}] Error during shutdown:`, error);
    process.exit(1);
  }
}

/* eslint-disable @typescript-eslint/no-misused-promises */
/**
 * Registers handlers for SIGINT and SIGTERM to gracefully shut down the process.
 * @param fn The async function to run during shutdown.
 * @param tag A label for logging.
 */
export function gracefulShutdown(fn: () => void | Promise<void>, tag: string, enabled: boolean) {
  if (enabled) {
    process.on("SIGINT", async () => {
      await shutdown(fn, tag, "SIGINT");
    });

    process.on("SIGTERM", async () => {
      await shutdown(fn, tag, "SIGTERM");
    });
  }
}
