import { Sidequest } from "../sidequest";
import { JobData, JobState } from "./schema/job-data";


export abstract class Job {
  queue: string;
  script: string;
  class: string;

  constructor(queue?: string) {
    this.queue = queue || 'default';
    this.script = buildPath();
    this.class = this.constructor.name;
  }
  
  abstract run(): void | Promise<void>;

  static async enqueue(this: { new (...args: any[]): Job }, ...args: any[]): Promise<void> {
    const job = new this(...args);
    const backend = Sidequest.getBackend();
    const jobData: JobData = {
      queue: job.queue,
      script: job.script,
      class: job.class,
      args: args,
      attempt: 0,
      max_attempts: 5
    }
    await backend.insertJob(jobData);
  }
}

function buildPath() {
  const err = new Error();
  const stackLines = err.stack?.split('\n');
  stackLines?.shift();
  const callerLine = stackLines?.find((line) => { return line.indexOf(__filename) === -1; });
  const match = callerLine?.match(/\((.*):\d+:\d+\)/);

  if (match) {
    return match[1];
  }

  throw new Error('Could not determine the task path');
}