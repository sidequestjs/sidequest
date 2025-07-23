import { JobData } from "@sidequest/core";
import { Engine } from "../engine";

export interface JobOptions {
  queue?: string;
  timeout?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobClassType = (new (...args: any[]) => Job) & { prototype: { run: (...args: any[]) => any } };

export abstract class Job {
  queue: string;
  script: string;
  class: string;
  timeout?: number;

  constructor(jobOptions?: JobOptions) {
    const options = Object.assign(
      {
        queue: "default",
      },
      jobOptions,
    );

    this.queue = options.queue;
    this.script = buildPath();
    this.class = this.constructor.name;
    this.timeout = options.timeout;
  }

  abstract run(...args: unknown[]): unknown;

  static config<T extends JobClassType>(this: T, jobOptions?: JobOptions) {
    return new JobBuilder(this).config(jobOptions);
  }

  static enqueue<T extends JobClassType>(
    this: T,
    ...args: Parameters<T["prototype"]["run"]>
  ): JobData | Promise<JobData> {
    return new JobBuilder(this).enqueue(...args);
  }
}

function buildPath() {
  const err = new Error();
  const stackLines = err.stack?.split("\n");
  stackLines?.shift();
  const callerLine = stackLines?.find((line) => {
    const exclude = import.meta.filename.replaceAll("\\", "/");
    return !line.includes(exclude);
  });
  const match = callerLine?.match(/(file:\/\/)?((\w:)?[/\\].+):\d+:\d+/);

  if (match) {
    return `file://${match[2]}`;
  }

  throw new Error("Could not determine the task path");
}

class JobBuilder<T extends JobClassType> {
  job?: Job;

  constructor(public JobClass: T) {}

  config(jobOptions?: JobOptions) {
    this.job = new this.JobClass(jobOptions);
    return this;
  }

  enqueue(...args: Parameters<T["prototype"]["run"]>) {
    this.job ??= new this.JobClass({ queue: "default" });

    const backend = Engine.getBackend();
    const jobData: JobData = {
      queue: this.job.queue,
      script: this.job.script,
      class: this.job.class,
      args: args,
      attempt: 0,
      max_attempts: 5,
      timeout: this.job.timeout,
    };
    return backend.insertJob(jobData);
  }
}
