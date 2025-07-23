import { Sidequest, SidequestConfig } from "../sidequest";
import { Job } from "../core/job";

export async function execute(jobData: Job, config: SidequestConfig): Promise<void> {
    await Sidequest.configure(config);
    const backend = Sidequest.getBackend();
    const script = await import(jobData.script);
    const JobClass = script[jobData.class];
    const args = jobData.args || [];
    const job: Job = new JobClass(...args);

    Object.assign(job, jobData);

    job.state = 'running';
    job.attempted_at = new Date();
    job.attempt = job.attempt ? job.attempt + 1 : 1;
    let updated = await backend.updateJob(job);
    Object.assign(job, updated);
    try {
      const result = await job.run();
      job.completed_at = new Date();
      job.state = 'completed';
      job.result = result; 
      await backend.updateJob(job);
    } catch (error: any){
      if(!job.errors){
        job.errors = [];
      }
      const errData = serializeError(error);
      errData.attempt = job.attempt;
      errData.attempted_at = job.attempted_at;
      errData.attempt_by = job.claimed_by;
      job.errors.push(errData);
      job.available_at = calculateBackoff(job.attempt);
      const max_attempts = job.max_attempts || 5;
      if(job.attempt < max_attempts){
        job.state = 'pending';
      } else {
        job.state = 'discarded';
      }
      await backend.updateJob(job);
    }
}

function calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 3600000): Date {
  const jitter = Math.random() + 0.5;
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, maxDelay);
  return new Date(Date.now() + delay);
}

process.on('message', async (message: {job: Job, config: SidequestConfig}) => {
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

function serializeError(err: Error): any {
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
  return plain;
}
