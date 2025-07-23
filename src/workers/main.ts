import path from "path";
import { Job, Sidequest, SidequestConfig } from "../sidequest";
import { fork } from "child_process";

const executorPath = path.resolve(__dirname, 'executor.js');

async function run(sidequestConfig: SidequestConfig){
  Sidequest.configure(sidequestConfig);

  const activeJobsPerQueue: Record<string, Set<ReturnType<typeof fork>>> = {};
  
  const heartBeat = async () => {
    const backend = Sidequest.getBackend();
    const queueNames = await backend.getQueuesNames();

    for(let queue of queueNames){
      if (!activeJobsPerQueue[queue]) {
        activeJobsPerQueue[queue] = new Set();
      }
      const activeJobs = activeJobsPerQueue[queue];
      const queueConfig = Sidequest.getQueueConfig(queue);
      const limit = queueConfig.concurrency || 10;

      if(activeJobs.size >= limit){
        console.log(`queue ${queue} limit reached!`);
        continue;
      }

      const availableSlots = limit - activeJobs.size;
      
      const jobs: Job[] = await backend.claimPendingJob(queue, availableSlots);

      for (const job of jobs) {
        const child = fork(executorPath);
        activeJobs.add(child);
  
        child.on("exit", () => {
          activeJobs.delete(child);
        });
  
        child.send(job);
      }
    }

    setTimeout(heartBeat, 200);
  }

  heartBeat();
}

process.on('message', async (sidequestConfig: SidequestConfig) => {
  try {
    await run(sidequestConfig);
  } catch (error: any){
    console.log(error);
    process.exit(1);
  }
});