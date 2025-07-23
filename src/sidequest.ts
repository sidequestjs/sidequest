import { ChildProcess, fork } from 'child_process';
import { Job } from './core/job';
import path from 'path';
import { Backend } from './backends/backend';
import { PostgresBackend } from './sidequest';

type JobConstructor<T extends Job = Job> = new (...args: any[]) => T;

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

  static start(config: SidequestConfig){
    if(!_mainWorker){
      Sidequest.configure(config);
      _mainWorker = fork(workerPath);
      _mainWorker.send(config);
    }
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