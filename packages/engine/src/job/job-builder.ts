import { NewJobData } from "@sidequest/backend";
import {
  AliveJobConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type AliveJobUniqueness,
  FixedWindowConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type FixedWindowUniqueness,
  JobData,
  logger,
  TimePeriod,
  UniquenessConfig,
  UniquenessFactory,
} from "@sidequest/core";
import { Engine } from "../engine";
import { JOB_BUILDER_FALLBACK } from "./constants";
import { JobClassType } from "./job";

/**
 * Configuration for job uniqueness constraints.
 *
 * @remarks
 * Controls how jobs are deduplicated to prevent multiple instances of the same job from running.
 *
 * - When `true`: Jobs are made unique based on their type/name only
 * - When `false`: No uniqueness constraint is applied
 * - When an object: Provides fine-grained control over uniqueness behavior
 *
 * @example
 * ```typescript
 * // Simple uniqueness
 * const unique: UniquenessInput = true;
 *
 * // No uniqueness
 * const notUnique: UniquenessInput = false;
 *
 * // Advanced uniqueness with arguments consideration
 * const advancedUnique: UniquenessInput = {
 *   withArgs: true,
 *   period: { hours: 1 }
 * };
 * ```
 */
export type UniquenessInput = boolean | { withArgs?: boolean; period?: TimePeriod };

export interface JobBuilderDefaults {
  /** Default queue name for jobs built with the JobBuilder */
  queue?: string;
  /** Default timeout in milliseconds for jobs built with the JobBuilder */
  timeout?: number;
  /** Default uniqueness configuration for jobs built with the JobBuilder */
  uniqueness?: UniquenessInput;
  /** Default maximum attempts for jobs built with the JobBuilder */
  maxAttempts?: number;
  /** Default available at date for jobs built with the JobBuilder */
  availableAt?: Date;
}

/**
 * Builder for creating and enqueuing jobs with custom configuration.
 * @template T The job class type.
 */
export class JobBuilder<T extends JobClassType> {
  private constructorArgs?: ConstructorParameters<T>;
  private queueName?: string;
  private jobTimeout?: number;
  private uniquenessConfig?: UniquenessConfig;
  private jobMaxAttempts?: number;
  private jobAvailableAt?: Date;

  /**
   * Creates a new JobBuilder for the given job class.
   * @param JobClass The job class constructor.
   */
  constructor(
    private JobClass: T,
    private defaults?: JobBuilderDefaults,
  ) {
    this.queue(this.defaults?.queue ?? JOB_BUILDER_FALLBACK.queue!);
    this.maxAttempts(this.defaults?.maxAttempts ?? JOB_BUILDER_FALLBACK.maxAttempts!);
    this.availableAt(this.defaults?.availableAt ?? JOB_BUILDER_FALLBACK.availableAt!);
    this.timeout(this.defaults?.timeout ?? JOB_BUILDER_FALLBACK.timeout!);
    this.unique(this.defaults?.uniqueness ?? JOB_BUILDER_FALLBACK.uniqueness!);
    this.with(...(JOB_BUILDER_FALLBACK.constructorArgs as unknown as ConstructorParameters<T>));
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
   * @param value Boolean or uniqueness config object. If true, uses an alive job uniqueness strategy (see {@link AliveJobUniqueness}).
   * If false, disables uniqueness. If an object, uses the custom uniqueness strategy.
   * @param value.withArgs If true, uniqueness is based on job class and job arguments.
   * If false, uniqueness is based only on the job class.
   * @param value.period  If a period is provided, uses a fixed window uniqueness strategy (see {@link FixedWindowUniqueness}).
   * @returns This builder instance.
   * @see {@link UniquenessInput} for more details.
   */
  unique(value: UniquenessInput): this {
    if (typeof value === "boolean") {
      if (value) {
        const config: AliveJobConfig = {
          type: "alive-job",
          withArgs: false,
        };
        this.uniquenessConfig = config;
      } else {
        this.uniquenessConfig = undefined; // no uniqueness
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
    const job = new this.JobClass(...this.constructorArgs!);

    await job.ready();

    if (!job.script) {
      throw new Error(`Error on starting job ${job.className} could not detect source file.`);
    }

    const backend = Engine.getBackend()!;
    const jobData: NewJobData = {
      queue: this.queueName!,
      script: job.script,
      class: job.className,
      state: "waiting",
      args,
      constructor_args: this.constructorArgs!,
      attempt: 0,
      max_attempts: this.jobMaxAttempts!,
      available_at: this.jobAvailableAt!,
      timeout: this.jobTimeout!,
      uniqueness_config: this.uniquenessConfig!,
    };
    logger("JobBuilder").debug(
      `Enqueuing job ${job.className} with args: ${JSON.stringify(args)}
      and constructor args: ${JSON.stringify(this.constructorArgs)}`,
    );

    if (this.uniquenessConfig) {
      const uniqueness = UniquenessFactory.create(this.uniquenessConfig);
      jobData.unique_digest = uniqueness.digest(jobData as JobData);
      logger("JobBuilder").debug(`Job ${job.className} uniqueness digest: ${jobData.unique_digest}`);
    }

    return backend.createNewJob(jobData);
  }
}
