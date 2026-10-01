// Starts Sidequest with the pino logger adapter, runs one LoggingJob and stops.
// Spawned by pino-logger.integration.test.mjs, which checks what it writes to stdout.
import { Sidequest } from "sidequest";
import { LoggingJob } from "./jobs/logging-job.js";

const [backendFile] = process.argv.slice(2);

await Sidequest.start({
  backend: { driver: "@sidequest/sqlite-backend", config: backendFile },
  dashboard: { enabled: false },
  logger: { level: "info", adapter: "pino" },
  maxConcurrentJobs: 1,
  minThreads: 1,
  maxThreads: 1,
});

const job = await Sidequest.build(LoggingJob).enqueue("Hello from a worker thread");
for (let i = 0; i < 100 && (await Sidequest.job.get(job.id))?.state !== "completed"; i++) {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

await Sidequest.stop();
process.exit(0);
