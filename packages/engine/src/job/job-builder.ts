import { JobData } from "@sidequest/core";
import { DefaultDeduplicationStrategy } from "../deduplication/default";
import { Engine } from "../engine";
import { JobClassType } from "./job";
export class JobBuilder<T extends JobClassType> {
  private JobClass: T;
  private constructorArgs: ConstructorParameters<T>;
  private queueName: string;
  private jobTimeout?: number;
  private uniqueJob: boolean;
  private deduplicationStrategy: DefaultDeduplicationStrategy;

  constructor(JobClass: T) {
    this.JobClass = JobClass;
    this.constructorArgs = [] as unknown[] as ConstructorParameters<T>;
    this.queueName = "default";
    this.uniqueJob = false;
    this.deduplicationStrategy = new DefaultDeduplicationStrategy();
  }

  with(...args: ConstructorParameters<T>): this {
    this.constructorArgs = args;
    return this;
  }

  queue(queue: string): this {
    this.queueName = queue;
    return this;
  }

  timeout(ms: number): this {
    this.jobTimeout = ms;
    return this;
  }

  unique(value = false): this {
    this.uniqueJob = value;
    return this;
  }

  deduplication(strategy: DefaultDeduplicationStrategy): this {
    this.deduplicationStrategy = strategy;
    return this;
  }

  async enqueue(...args: Parameters<InstanceType<T>["run"]>) {
    const job = new this.JobClass(...this.constructorArgs);

    if (this.uniqueJob && (await this.deduplicationStrategy.isDuplicated(this.JobClass, args))) {
      throw new Error(`The job ${job.className} with args ${args.toString()} is duplicated.`);
    }

    const backend = Engine.getBackend();
    const jobData: JobData = {
      queue: this.queueName,
      script: job.script,
      class: job.className,
      args: args,
      constructor_args: this.constructorArgs,
      attempt: 0,
      max_attempts: 5,
      timeout: this.jobTimeout,
    };
    return backend.insertJob(jobData);
  }
}
