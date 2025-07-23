import { fork } from 'child_process';
import { Job } from './core/job';
import path from 'path';
import { Backend } from './backends/backend';
import nodeCron from 'node-cron';

type JobConstructor<T extends Job = Job> = new (...args: any[]) => T;

const daemonPath = path.resolve(__dirname, 'core', 'daemon.js');

let _backend: Backend;

export class Sidequest {
  static enqueue<T extends Job>(JobClass: JobConstructor<T>, ...args: ConstructorParameters<JobConstructor<T>>): void{
    const job = new JobClass(...args);
    const metadata = {
      filePath: job.script,
      className: job.className,
      args: args
    }

    const daemon = fork(daemonPath);

    daemon.send(metadata);
  }

  static async useBackend(backend: Backend): Promise<void> {
    _backend = backend;
    await _backend.setup();
  }

  static getBackend(){
    return _backend;
  }

  static run(){
    nodeCron.schedule('* * * * * *', async () => {
      // claim job
      const job = await _backend.claimPendingJob('priority');

      console.log(job);
      // dispatch to daemon
    });
  }
}

export { Job } from './core/job';
export { PostgresBackend } from './backends/postgres/postgres-backend';