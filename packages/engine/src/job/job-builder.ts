import {
  AliveJobConfig,
  FixedWindowConfig,
  JobData,
  TimePeriod,
  UniquenessConfig,
  UniquenessFactory,
} from "@sidequest/core";
import { Engine } from "../engine";
import { JobClassType } from "./job";

export class JobBuilder<T extends JobClassType> {
  private JobClass: T;
  private constructorArgs: ConstructorParameters<T>;
  private queueName: string;
  private jobTimeout?: number;
  private uniquenessConfig?: UniquenessConfig;

  constructor(JobClass: T) {
    this.JobClass = JobClass;
    this.constructorArgs = [] as unknown[] as ConstructorParameters<T>;
    this.queueName = "default";
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

  unique(value: boolean | { withArgs?: boolean; period?: TimePeriod }): this {
    if (typeof value === "boolean") {
      if (value) {
        const config: AliveJobConfig = {
          type: "alive-job",
          withArgs: false,
        };
        this.uniquenessConfig = config;
      }
    } else {
      if (value.period) {
        this.uniquenessConfig = {
          type: "fixed-window",
          period: value.period,
          withArgs: value.withArgs,
        } as FixedWindowConfig;
      } else {
        this.uniquenessConfig = { type: "alive-job", withArgs: value.withArgs } as AliveJobConfig;
      }
    }
    return this;
  }

  async enqueue(...args: Parameters<InstanceType<T>["run"]>) {
    const job = new this.JobClass(...this.constructorArgs);

    await job.ready();

    if (!job.script) {
      throw new Error(`Error on starting job ${job.className} could not detect source file.`);
    }

    const backend = Engine.getBackend()!;
    const jobData: JobData = {
      queue: this.queueName,
      script: job.script,
      class: job.className,
      state: "waiting",
      args: args,
      constructor_args: this.constructorArgs,
      attempt: 0,
      max_attempts: 5,
      timeout: this.jobTimeout,
      uniqueness_config: this.uniquenessConfig,
    };

    if (this.uniquenessConfig) {
      const uniqueness = UniquenessFactory.create(this.uniquenessConfig);
      jobData.unique_digest = uniqueness.digest(jobData);
    }

    return backend.insertJob(jobData);
  }
}
