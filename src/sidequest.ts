import { ChildProcess, fork } from 'child_process';
import path from 'path';
import { Backend } from './backends/backend';
import { grantQueueConfig } from './core/queue/grant-queue-config';
import { QueueConfig } from './core/schema/queue-config';
import { SqliteBackend } from './backends/sqlite/sqlite-backend';
import { configureLogger, LoggerOptions } from './core/logger';

const workerPath = path.resolve(__dirname, 'workers', 'main.js');

let _backend: Backend;
let _config: SidequestConfig;

let _mainWorker: ChildProcess | undefined;

export type SidequestConfig = {
  backend?: Backend,
  queues?: Map<string, QueueConfig>
  logger?: LoggerOptions
}

export  class Sidequest {
  static async configure(config?: SidequestConfig){
    _config = config || { queues: new Map<string, QueueConfig>};
    _backend = config?.backend || new SqliteBackend();
    
    if(config?.logger){
      configureLogger(config.logger);
    }
    await _backend.setup();
    if(_config.queues){
      for(let queue of Object.keys(_config.queues)){
        await grantQueueConfig(queue, _config.queues[queue]);
      }
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
export { LoggerOptions } from './core/logger';