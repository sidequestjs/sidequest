import { Sidequest, SidequestConfig } from "../sidequest";
import { JobData } from "../core/job";

export async function execute(jobData: JobData, config: SidequestConfig): Promise<void> {
    // Sidequest.configure(config);
    const script = await import(jobData.script);
    const JobClass = script[jobData.class];
    const args = jobData.args || [];
    const job = new JobClass(...args);

    return await job.run();
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

function serializeError(err: Error) {
  const plain = {
    name:    err.name,
    message: err.message,
    stack:   err.stack,
    ...Object.getOwnPropertyNames(err)
      .filter(k => !['name','message','stack'].includes(k))
      .reduce((acc, k) => {
        acc[k] = err[k];
        return acc;
      }, {})
  };
  return JSON.stringify(plain);
}
