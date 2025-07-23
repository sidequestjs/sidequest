import { JobData } from "@sidequest/core";
import { DefaultDeduplicationStrategy } from "../deduplication/default";
import { DeduplicationStrategy } from "../deduplication/strategy";
import { Engine } from "../engine";

export interface JobOptions {
  queue?: string;
  timeout?: number;
  unique?: boolean;
  deduplicationStrategy?: DeduplicationStrategy;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JobClassType = (new (...args: any[]) => Job) & { prototype: { run: (...args: any[]) => any } };

export abstract class Job {
  script: string;
  class: string;

  constructor() {
    this.script = buildPath();
    this.class = this.constructor.name;
  }

  abstract run(...args: unknown[]): unknown;

  static enqueue<T extends JobClassType>(
    this: T,
    jobOptions?: JobOptions,
    ...args: Parameters<T["prototype"]["run"]>
  ): JobData | Promise<JobData> {
    return JobBuilder.enqueue(this, jobOptions, ...args);
  }
}

function buildPath() {
  const err = new Error();
  const stackLines = err.stack?.split("\n");
  stackLines?.shift();
  const callerLine = stackLines?.find((line) => {
    line = line.replaceAll("\\", "/");
    const exclude = import.meta.filename.replaceAll("\\", "/");
    return !line.includes(exclude);
  });

  const match = callerLine?.match(/(file:\/\/)?((\w:)?[/\\].+):\d+:\d+/);

  if (match) {
    return `file://${match[2]}`;
  }

  throw new Error("Could not determine the task path");
}

class JobBuilder {
  static async enqueue<T extends JobClassType>(
    JobClass: T,
    jobOptions?: JobOptions,
    ...args: Parameters<T["prototype"]["run"]>
  ) {
    const job = new JobClass();

    const queue = jobOptions?.queue ?? "default";
    const timeout = jobOptions?.timeout;
    const unique = jobOptions?.unique ?? false;
    const deduplicationStrategy = jobOptions?.deduplicationStrategy ?? new DefaultDeduplicationStrategy();

    if (unique && (await deduplicationStrategy.isDuplicated(JobClass, args))) {
      throw new Error(`The job ${job.class} with args ${args.toString()} is duplicated.`);
    }

    const backend = Engine.getBackend();
    const jobData: JobData = {
      queue,
      script: job.script,
      class: job.class,
      args,
      attempt: 0,
      max_attempts: 5,
      timeout,
    };
    return backend.insertJob(jobData);
  }
}
