import { Sidequest } from "../sidequest";

export type JobState = 'pending' | 'claimed' | 'running' | 'discarded' | 'completed' | 'cancelled';

export abstract class Job {
  id?: number;
  queue: string;
  state?: JobState;
  script: string;
  class: string;
  args?: any[];
  attempt?: number;
  max_attempts?: number;
  result?: any;
  errors?: any[];
  inserted_at?: Date;
  attempted_at?: Date;
  available_at?: Date;
  completed_at?: Date;
  discarded_at?: Date;
  cancelled_at?: Date;
  claimed_at?: Date;
  claimed_by?: string;

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