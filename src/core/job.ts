import { Sidequest } from "../sidequest";
import { JobData, JobState } from "./schema/job-data";

export type JobOptions = {
  queue?: string,
  timeout?: number
}

export abstract class Job {
  queue: string;
  script: string;
  class: string;
  timeout?: number;

  constructor(jobOptions?: JobOptions) {
    const options = Object.assign({
      queue: 'default'
    }, jobOptions);
    
    this.queue = options.queue;
    this.script = buildPath();
    this.class = this.constructor.name;
    this.timeout = options.timeout;
  }
  
  abstract run(): any | Promise<any>;

  static enqueue(this: { new (...args: any[]): Job }, ...args: any[]): JobData | Promise<JobData> {
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
    return backend.insertJob(jobData);
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