import { Job, JobData } from "../core/job";

export async function startDaemon(jobData: JobData): Promise<void> {
    const script = await import(jobData.script);
    const JobClass = script[jobData.class];
    const args = jobData.args || [];
    const job = new JobClass(...args);

    await job.run();
}

process.on('message', async (jobData: JobData) => {
  await startDaemon(jobData);
  process.exit(0);
})