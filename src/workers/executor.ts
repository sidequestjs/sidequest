import { Sidequest, SidequestConfig } from "../sidequest";
import { Job } from "../core/job";
import { JobData } from "../core/schema/job-data";
import { JobActions } from "../core/job/job-actions";
import logger from "../core/logger";

export async function execute(jobData: JobData, config: SidequestConfig): Promise<void> {
  await Sidequest.configure(config);
  
  const script = await import(jobData.script);
  const JobClass = script[jobData.class];

  if (!JobClass || typeof JobClass !== 'function') {
    throw new Error(`Invalid job class: ${jobData.class}`);
  }

  const args = jobData.args;
  const job: Job = new JobClass(...args);
  
  jobData = await JobActions.setRunning(jobData);
  try {
    logger().info(`Running job ${jobData.class} with args: ${JSON.stringify(jobData.args)}`);
    const result = await executeTask(job);
    jobData = await JobActions.setComplete(jobData, result);
    logger().info(`Job ${jobData.class} has completed with args: ${JSON.stringify(jobData.args)}`);
  } catch (error: any){
    JobActions.setFailed(jobData, error);
    throw error;
  }
}

export function executeTask(job: Job){
  const promises: Promise<any>[] = [];

  if(job.timeout){
    const timeout = new Promise((resolve, reject) => setTimeout(()=> {
      reject(new Error(`Job ${job.class} timed out: ${ JSON.stringify(job) }`));
    }, job.timeout))
    promises.push(timeout);
  }

  const run = new Promise(async (resolve, reject) => {
    try {
      const result = await job.run();
      resolve(result);
    } catch(error: any){
      reject(error);
    }
  });

  promises.push(run);

  return Promise.race(promises);
}

process.on('message', async (message: {job: JobData, config: SidequestConfig}) => {
  try {
    await execute(message.job, message.config);
    process.exit(0);
  } catch (error: any){
    logger().error(error);
    process.exit(1);
  }
});

process.on('disconnect', () => {
  logger().warn('Parent process disconected, exiting...');
  process.exit();
});

if(process.send) process.send('ready');