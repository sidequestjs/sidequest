import { ChildProcess, fork } from 'child_process';
import path from 'path';
import { Backend } from './backends/backend';
import { grantQueueConfig } from './core/queue/grant-queue-config';
import { QueueConfig } from './core/schema/queue-config';
import { SqliteBackend } from './backends/sqlite/sqlite-backend';
import logger, { configureLogger, LoggerOptions } from './core/logger';
import { PostgresBackend } from './backends/postgres/postgres-backend';

import { runWeb } from './web/app';

const workerPath = path.resolve(__dirname, 'workers', 'main.js');

let _backend: Backend;
let _config: SidequestConfig;
let _mainWorker: ChildProcess | undefined;

const availableBackends = {
  postgres: PostgresBackend,
  sqlite: SqliteBackend
}

export type BackEndConfig = {
  type: 'postgres' | 'sqlite';
  config: any
}

export type SidequestConfig = {
  backend?: BackEndConfig,
  queues?: Map<string, QueueConfig>
  logger?: LoggerOptions,
  maxConcurrentJobs?: number
}

export  class Sidequest {
  static async configure(config?: SidequestConfig){
    if(_config){
      logger().warn("Sidequest already configured")
      return;
    }
    _config = config || { queues: new Map<string, QueueConfig>};
    if(config?.backend){
      if (availableBackends[config.backend.type]){
        _backend = new availableBackends[config.backend.type](config.backend.config);
      } else {
        throw new Error(`Unkown backend ${config.backend.type}`);
      }
    } else {
      _backend =  new SqliteBackend();
    }

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
            logger().error('sidequest main exited, creating new...')
            runWorker()
          });
        }

        runWorker();
      }

      runWeb();
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