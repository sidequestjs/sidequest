import { Sidequest, SidequestConfig } from "../sidequest";
import { Job } from "../core/job";
import { JobData } from "../core/schema/job-data";
import { JobActions } from "../core/job/job-actions";

export async function execute(jobData: JobData, config: SidequestConfig): Promise<void> {
    await Sidequest.configure(config);
    const backend = Sidequest.getBackend();
    const script = await import(jobData.script);
    const JobClass = script[jobData.class];
    const args = jobData.args || [];
    const job: Job = new JobClass(...args);

    jobData = await JobActions.setRunning(jobData);
    try {
      const result = await job.run();
      jobData = await JobActions.setComplete(jobData, result);
    } catch (error: any){
     
    }
}


process.on('message', async (message: {job: JobData, config: SidequestConfig}) => {
  try {
    await execute(message.job, message.config);
    process.exit(0);
  } catch (error: any){
    console.error(error);
    process.exit(1);
  }
});

process.on('disconnect', () => {
  console.log('Parent process disconected, exiting...');
  process.exit();
});

if(process.send) process.send('ready');


