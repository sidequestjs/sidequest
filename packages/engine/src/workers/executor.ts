import { JobData, logger } from "@sidequest/core";
import { Engine, SidequestConfig } from "../engine";
import { Job, JobClassType } from "../job/job";
import { JobActions } from "../job/job-actions";

export async function execute(jobData: JobData, config: SidequestConfig): Promise<void> {
  await Engine.configure(config);

  const script = (await import(jobData.script)) as Record<string, JobClassType>;
  const JobClass = script[jobData.class] ?? script.default;

  if (!JobClass || typeof JobClass !== "function") {
    throw new Error(`Invalid job class: ${jobData.class}`);
  }

  const job: Job = new JobClass(jobData.constructor_args);

  jobData = await JobActions.setRunning(jobData);
  try {
    logger().info(`Running job ${jobData.class} with args: ${JSON.stringify(jobData.args)}`);
    const result = await executeTask(job, jobData);
    jobData = await JobActions.setComplete(jobData, result);
    logger().info(`Job ${jobData.class} has completed with args: ${JSON.stringify(jobData.args)}`);
  } catch (error) {
    await JobActions.setFailed(jobData, error as Error);
    throw error;
  }
}

export function executeTask(job: Job, jobData: JobData) {
  const promises: Promise<unknown>[] = [];
  if (jobData.timeout) {
    const timeoutPromise = new Promise((resolve, reject) =>
      setTimeout(() => {
        reject(new Error(`Job ${job.className} timed out: ${JSON.stringify(job)}`));
      }, jobData.timeout),
    );
    promises.push(timeoutPromise);
  }

  const run = Promise.resolve().then(() => job.run(...jobData.args));

  promises.push(run);

  return Promise.race(promises);
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on("message", async (message: { job: JobData; config: SidequestConfig }) => {
    try {
      await execute(message.job, message.config);
      process.exit(0);
    } catch (error) {
      logger().error(error);
      process.exit(1);
    }
  });

  process.on("disconnect", () => {
    logger().warn("Parent process disconected, exiting...");
    process.exit();
  });

  if (process.send) process.send("ready");
}
