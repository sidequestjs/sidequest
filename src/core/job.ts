import { Sidequest } from "../sidequest";

export interface JobData {
  script: string;
  class: string;
  queue: string;
  args?: any[];
}

export abstract class Job implements JobData{
  script: string;
  class: string;
  queue: string;

  constructor(queue?: string) {
    this.queue = queue || 'default';
    this.script = buildPath();
    this.class = this.constructor.name;
  }
  
  abstract run(): void | Promise<void>;

  static async enqueue(this: { new (...args: any[]): Job }, ...args: any[]): Promise<void> {
    const job = new this(...args);
    const backend = Sidequest.getBackend();
    await backend.insertJob(job, args);
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