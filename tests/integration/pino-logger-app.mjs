// Starts Sidequest with the pino logger adapter, runs two LoggingJobs on one worker thread and stops.
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

// Two jobs on a single worker thread: the second job's entry must not be held back.
const jobs = [
  await Sidequest.build(LoggingJob).enqueue("Hello from the first job"),
  await Sidequest.build(LoggingJob).enqueue("Hello from the second job"),
];
const allCompleted = async () =>
  (await Promise.all(jobs.map((job) => Sidequest.job.get(job.id)))).every((job) => job?.state === "completed");
for (let i = 0; i < 100 && !(await allCompleted()); i++) {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

await Sidequest.stop();
process.exit(0);
