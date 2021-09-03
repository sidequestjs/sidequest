import { fork } from 'child_process';

import loadConfig from '../loader/load-config';


const queues:any = {};

async function start() {
  const config:any = await loadConfig();
  config?.queues?.forEach((queue:any) => {
    const workers = [];
    const numWorkers = queue.workers || 5;

    for(let i = workers.length; i < numWorkers; i++){  
      const worker = fork(__dirname + '/worker');
      workers.push(worker);
      worker.send({ command: 'start', queue: queue.name });
    }

    queues[queue.name] = {
      workers
    };
  });
}

async function stop() {
}

export {
  start,
  stop
}