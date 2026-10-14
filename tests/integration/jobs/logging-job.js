import { threadId } from "node:worker_threads";
import { Job, logger } from "sidequest";

/**
 * A job that writes one entry through Sidequest's logger, tagged with the thread it ran in.
 */
export class LoggingJob extends Job {
  run(message) {
    logger("LoggingJob").info(message, { threadId });
    return message;
  }
}
