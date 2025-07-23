import { ChildProcess, fork } from 'child_process';
import path from 'path';
import { Backend } from './backends/backend';
import { PostgresBackend } from './sidequest';
import { grantQueueConfig } from './core/queue/grant-queue-config';
import { QueueConfig } from './core/schema/queue-config';

const workerPath = path.resolve(__dirname, 'workers', 'main.js');

let _backend: Backend;
let _config: SidequestConfig;

let _mainWorker: ChildProcess | undefined;

export type QueueState = 'active' | 'paused';

export type SidequestConfig = {
  backend_url: string,
  queues: Map<string, QueueConfig>
}

export  class Sidequest {
  static async configure(config: SidequestConfig){
    _config = config;
    _backend = new PostgresBackend({ connection: config.backend_url });
    await _backend.setup();
    for(let queue of Object.keys(config.queues)){
      await grantQueueConfig(queue, config.queues[queue])
    }
  }

  static async start(config: SidequestConfig): Promise<void>{
    await Sidequest.configure(config);
    
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(()=> {
        reject(new Error('timeout on starting sidequest fork!'))
      }, 5000);

      if(!_mainWorker){
        const runWorker = ()=> {
          _mainWorker = fork(workerPath);
          _mainWorker.on('message', (msg)=>{
            if(msg === 'ready'){
              _mainWorker?.send(config);
              clearTimeout(timeout);
              resolve()
            }
          });

          _mainWorker.on('exit', ()=> {
            console.log('sidequest main exited, creating new...')
            runWorker()
          });
        }

        runWorker();
      }
    });
  }

  static getBackend(){
    return _backend;
  }

  static async getQueueConfig(queue: string): Promise<QueueConfig> {
    return _backend.getQueueConfig(queue);
  }
}

export { Job } from './core/job';
export { PostgresBackend } from './backends/postgres/postgres-backend';