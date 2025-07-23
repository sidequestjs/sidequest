import { NewJobData } from "@sidequest/backend";
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

/**
 * Builder for creating and enqueuing jobs with custom configuration.
 * @template T The job class type.
 */
export class JobBuilder<T extends JobClassType> {
  private JobClass: T;
  private constructorArgs: ConstructorParameters<T>;
  private queueName: string;
  private jobTimeout?: number;
  private uniquenessConfig?: UniquenessConfig;
  private jobMaxAttempts?: number;
  private jobAvailableAt?: Date;

  /**
   * Creates a new JobBuilder for the given job class.
   * @param JobClass The job class constructor.
   */
  constructor(JobClass: T) {
    this.JobClass = JobClass;
    this.constructorArgs = [] as unknown[] as ConstructorParameters<T>;
    this.queueName = "default";
  }

  /**
   * Sets the constructor arguments for the job.
   * @param args The constructor arguments.
   * @returns This builder instance.
   */
  with(...args: ConstructorParameters<T>): this {
    this.constructorArgs = args;
    return this;
  }

  /**
   * Sets the queue name for the job.
   * @param queue The queue name.
   * @returns This builder instance.
   */
  queue(queue: string): this {
    this.queueName = queue;
    return this;
  }

  /**
   * Sets the timeout for the job in milliseconds.
   * @param ms Timeout in milliseconds.
   * @returns This builder instance.
   */
  timeout(ms: number): this {
    this.jobTimeout = ms;
    return this;
  }

  /**
   * Sets the uniqueness configuration for the job.
   * @param value Boolean or uniqueness config object. If true, uses an alive job uniqueness strategy.
   * If false, disables uniqueness. If an object, uses the custom uniqueness strategy.
   * @returns This builder instance.
   */
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

  /**
   * Sets the maximum number of attempts for the job.
   * @param value The max attempts.
   * @returns This builder instance.
   */
  maxAttempts(value: number): this {
    this.jobMaxAttempts = value;
    return this;
  }

  /**
   * Sets the time when the job becomes available.
   * @param value The available date.
   * @returns This builder instance.
   */
  availableAt(value: Date): this {
    this.jobAvailableAt = value;
    return this;
  }

  /**
   * Enqueues the job with the specified arguments.
   * @param args Arguments to pass to the job's run method.
   * @returns A promise resolving to the created job data.
   */
  async enqueue(...args: Parameters<InstanceType<T>["run"]>) {
    const job = new this.JobClass(...this.constructorArgs);

    await job.ready();

    if (!job.script) {
      throw new Error(`Error on starting job ${job.className} could not detect source file.`);
    }

    const backend = Engine.getBackend()!;
    const jobData: NewJobData = {
      queue: this.queueName,
      script: job.script,
      class: job.className,
      state: "waiting",
      args,
      constructor_args: this.constructorArgs,
      attempt: 0,
      max_attempts: this.jobMaxAttempts ?? 5,
      available_at: this.jobAvailableAt ?? new Date(),
      timeout: this.jobTimeout ?? null,
      uniqueness_config: this.uniquenessConfig ?? null,
    };

    if (this.uniquenessConfig) {
      const uniqueness = UniquenessFactory.create(this.uniquenessConfig);
      jobData.unique_digest = uniqueness.digest(jobData as JobData);
    }

    return backend.createNewJob(jobData);
  }
}
