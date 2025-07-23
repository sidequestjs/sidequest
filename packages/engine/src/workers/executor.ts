import { JobData, logger } from "@sidequest/core";
import { Job, JobOptions } from "../job/job";
import { JobActions } from "../job/job-actions";
import { Engine, SidequestConfig } from "../sidequest";

export async function execute(jobData: JobData, config: SidequestConfig): Promise<void> {
  await Engine.configure(config);

  const script = (await import(jobData.script)) as Record<string, new (jobOptions?: JobOptions) => Job>;
  const JobClass = script[jobData.class];

  if (!JobClass || typeof JobClass !== "function") {
    throw new Error(`Invalid job class: ${jobData.class}`);
  }

  const args = jobData.args;
  const job: Job = new JobClass({ queue: jobData.queue, timeout: jobData.timeout });

  jobData = await JobActions.setRunning(jobData);
  try {
    logger().info(`Running job ${jobData.class} with args: ${JSON.stringify(jobData.args)}`);
    const result = await executeTask(job, args);
    jobData = await JobActions.setComplete(jobData, result);
    logger().info(`Job ${jobData.class} has completed with args: ${JSON.stringify(jobData.args)}`);
  } catch (error) {
    await JobActions.setFailed(jobData, error as Error);
    throw error;
  }
}

export function executeTask(job: Job, args: unknown[]) {
  const promises: Promise<unknown>[] = [];

  console.log(job);
  if (job.timeout) {
    const timeout = new Promise((resolve, reject) =>
      setTimeout(() => {
        reject(new Error(`Job ${job.class} timed out: ${JSON.stringify(job)}`));
      }, job.timeout),
    );
    promises.push(timeout);
  }

  const run = Promise.resolve().then(() => job.run(...args));

  promises.push(run);

  return Promise.race(promises);
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  process.on("message", async (message: { job: JobData; config: SidequestConfig }) => {
    try {
      await execute(message.job, message.config);
      process.exit(0);
    } catch (error: any) {
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
