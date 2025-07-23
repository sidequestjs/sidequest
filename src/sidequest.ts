import { ChildProcess, fork } from 'child_process';
import path from 'path';
import { Backend } from './backends/backend';
import { PostgresBackend } from './sidequest';

const workerPath = path.resolve(__dirname, 'workers', 'main.js');

let _backend: Backend;
let _config: SidequestConfig;

let _mainWorker: ChildProcess | undefined;

export type QueueConfig = {
  concurrency?: number,
  globalConcurrency?: number
}

export type SidequestConfig = {
  backend_url: string,
  queues: Map<string, QueueConfig>
}

export class Sidequest {
  static configure(config: SidequestConfig){
    _config = config;
    _backend = new PostgresBackend({ connection: config.backend_url });
  }

  static start(config: SidequestConfig): Promise<void>{
    Sidequest.configure(config);
    return new Promise(async (resolve, reject) => {
      await _backend.setup();
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

  static getQueueConfig(queue: string): QueueConfig {
    const config = _config.queues[queue];
    if(config){
      return config;
    }

    return {
      concurrency: 10
    }
  }
}

export { Job } from './core/job';
export { PostgresBackend } from './backends/postgres/postgres-backend';