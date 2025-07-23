import path from "path";
import { Job, Sidequest, SidequestConfig } from "../sidequest";
import { fork } from "child_process";

const executorPath = path.resolve(__dirname, 'executor.js');

async function run(sidequestConfig: SidequestConfig){
  await Sidequest.configure(sidequestConfig);

  const activeJobsPerQueue: Record<string, Set<ReturnType<typeof fork>>> = {};
  
  const heartBeat = async () => {
    try{
      const backend = Sidequest.getBackend();
      const queueNames = await backend.getQueuesFromJobs();

      for(let queue of queueNames){
        if (!activeJobsPerQueue[queue]) {
          activeJobsPerQueue[queue] = new Set();
        }
        const activeJobs = activeJobsPerQueue[queue];
        const queueConfig = await Sidequest.getQueueConfig(queue);
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
    
          child.on('message', (msg) => {
            if (msg === 'ready') {
              child.send({job, config: sidequestConfig});
            }
          });
        }
      }
    } catch (error: any){
      console.log(error)
    }

    setTimeout(heartBeat, 200);
  }

  setTimeout(heartBeat, 200);
}

process.on('message', async (sidequestConfig: SidequestConfig) => {
  try {
    await run(sidequestConfig);
  } catch (error: any){
    console.log(error);
    process.exit(1);
  }
});

process.on('disconnect', () => {
  console.log('Parent process disconected, exiting...');
  process.exit();
});

if(process.send) process.send('ready');

console.log('main running:', process.pid)