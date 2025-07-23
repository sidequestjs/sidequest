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
  
  abstract run(...args: any[]): any | Promise<any>;

  static config(this: { new (...args: any[]): Job }, jobOptions: JobOptions){
    return new JobBuilder(this).config(jobOptions);
  }

  static enqueue(this: { new (...args: any[]): Job }, ...args: any[]): JobData | Promise<JobData> {
    return new JobBuilder(this).enqueue(args);
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

class JobBuilder{
  JobClass: new (...args: any[]) => Job;
  job?: Job;

  constructor(JobClass: { new (...args: any[]): Job }){
    this.JobClass = JobClass;
  }

  config(options: JobOptions){
    this.job = new this.JobClass(options);
    return this;
  }

  enqueue(...args: any[]){
    if(!this.job){
      this.job = new this.JobClass({ queue: 'default' });
    }

    const backend = Sidequest.getBackend();
    const jobData: JobData = {
      queue: this.job.queue,
      script: this.job.script,
      class: this.job.class,
      args: args,
      attempt: 0,
      max_attempts: 5,
      timeout: this.job.timeout
    }
    return backend.insertJob(jobData);
  }
}