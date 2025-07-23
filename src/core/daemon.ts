import { Job } from "./job";

export async function startDaemon(message: any): Promise<Job> {
    const script = await import(message.filePath);
    const job = new script[message.className](...message.args);

    job.run();
    return job;
}


export function bind(){
  let job: Job;

  process.on('message', async (message: any) => {
    console.log(message)
    const job = await startDaemon(message);
    return job;
  })
}

bind();