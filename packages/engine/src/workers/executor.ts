import { FailTransition, JobData, logger, RunningTransition } from "@sidequest/core";
import { Engine, SidequestConfig } from "../engine";
import { Job, JobClassType } from "../job/job";
import { JobTransitioner } from "../job/job-transitioner";

export async function execute(jobData: JobData, config: SidequestConfig): Promise<void> {
  await Engine.configure(config);

  let script: Record<string, JobClassType> = {};
  try {
    script = (await import(jobData.script)) as Record<string, JobClassType>;
  } catch (error) {
    const errorMessage = `Failed to import job script "${jobData.script}": ${error instanceof Error ? error.message : String(error)}`;
    logger().error(errorMessage);
    await JobTransitioner.apply(jobData, new FailTransition(errorMessage));
    return;
  }

  const JobClass = script[jobData.class] ?? script.default;
  if (!JobClass || typeof JobClass !== "function") {
    const error = `Invalid job class: ${jobData.class}`;
    logger().error(error);
    await JobTransitioner.apply(jobData, new FailTransition(error));
    return;
  }

  const job: Job = new JobClass(jobData.constructor_args);

  jobData = await JobTransitioner.apply(jobData, new RunningTransition());

  const result = await job.perform(...jobData.args);
  await JobTransitioner.apply(jobData, result);
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on("message", async (message: { type: string; job: JobData; config: SidequestConfig }) => {
    if (message.type === "execute") {
      await execute(message.job, message.config);
      process.exit(0);
    } else if (message.type === "shutdown") {
      logger().info("Shutting down executor worker...");
      process.exit(0);
    }
  });

  process.on("disconnect", () => {
    logger().warn("Parent process disconected, exiting...");
    process.exit();
  });

  if (process.send) process.send("ready");
}
