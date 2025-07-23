import { JobData, logger, RunningTransition } from "@sidequest/core";
import { Engine, SidequestConfig } from "../engine";
import { Job, JobClassType } from "../job/job";
import { JobTransitioner } from "../job/job-transitioner";

export async function execute(jobData: JobData, config: SidequestConfig): Promise<void> {
  await Engine.configure(config);

  const script = (await import(jobData.script)) as Record<string, JobClassType>;
  const JobClass = script[jobData.class] ?? script.default;

  if (!JobClass || typeof JobClass !== "function") {
    throw new Error(`Invalid job class: ${jobData.class}`);
  }

  const job: Job = new JobClass(jobData.constructor_args);

  jobData = await JobTransitioner.apply(jobData, new RunningTransition());

  const result = await job.perform(...jobData.args);
  await JobTransitioner.apply(jobData, result);
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on("message", async (message: { job: JobData; config: SidequestConfig }) => {
    try {
      await execute(message.job, message.config);
      process.exit(0);
    } catch (error) {
      // avoid hidden errors, ex: when backend operation fail when updating job
      logger().error(error);
      process.exit(0);
    }
  });

  process.on("disconnect", () => {
    logger().warn("Parent process disconected, exiting...");
    process.exit();
  });

  if (process.send) process.send("ready");
}
