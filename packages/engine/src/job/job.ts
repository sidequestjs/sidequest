import { access } from "fs/promises";
import { pathToFileURL } from "url";

import {
  CompletedResult,
  FailedResult,
  isJobResult,
  JobResult,
  logger,
  RetryResult,
  SnoozeResult,
  toErrorData,
} from "@sidequest/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JobClassType = (new (...args: any) => Job) & { prototype: { run: (...args: unknown[]) => unknown } };

export abstract class Job {
  private _script?: string;
  private scriptResolver: Promise<string | void>;

  constructor() {
    /* IMPORTANT: the build path resolution must be called here.
     * This is important to ensure the path resolution is returning the Job implementation.
     */
    this.scriptResolver = buildPath(this.constructor.name).then((script) => {
      this._script = script;
      return script;
    });
  }

  get script() {
    return this._script;
  }

  get className() {
    return this.constructor.name;
  }

  ready() {
    return this.scriptResolver;
  }

  snooze(delay: number): SnoozeResult {
    return { __is_job_transition__: true, type: "snooze", delay: delay };
  }

  retry(reason: string | Error, delay?: number): RetryResult {
    const error = toErrorData(reason);
    return { __is_job_transition__: true, type: "retry", error, delay };
  }

  fail(reason: string | Error): FailedResult {
    const error = toErrorData(reason);
    return { __is_job_transition__: true, type: "failed", error };
  }

  complete(result: unknown): CompletedResult {
    return { __is_job_transition__: true, type: "completed", result };
  }

  async perform<T extends JobClassType>(...args: Parameters<T["prototype"]["run"]>): Promise<JobResult> {
    try {
      const result = await this.run(...args);
      if (isJobResult(result)) {
        return result;
      }
      return { __is_job_transition__: true, type: "completed", result };
    } catch (error) {
      logger().debug(error);
      const errorData = toErrorData(error as Error);
      return { __is_job_transition__: true, type: "retry", error: errorData };
    }
  }

  abstract run(...args: unknown[]): unknown;
}

// TODO need to test this with unit tests
async function buildPath(className: string) {
  const err = new Error();
  let stackLines = err.stack?.split("\n") ?? [];
  stackLines = stackLines.slice(1);

  const filePaths = stackLines
    .map((line) => {
      const match = /(file:\/\/)?(((\/?)(\w:))?([/\\].+)):\d+:\d+/.exec(line);
      if (match) {
        return `${match[5] ?? ""}${match[6].replaceAll("\\", "/")}`;
      }
      return null;
    })
    .filter(Boolean);

  for (const filePath of filePaths) {
    const hasExported = await hasClassExported(filePath!, className);
    if (hasExported) {
      return `file://${filePath}`;
    }
  }

  if (filePaths.length > 0) {
    return `file://${filePaths[0]}`;
  }

  throw new Error("Could not determine the task path");
}

async function hasClassExported(filePath: string, className: string): Promise<boolean> {
  try {
    await access(filePath);
  } catch {
    return false;
  }

  try {
    const moduleUrl = pathToFileURL(filePath).href;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod: Record<string, unknown> = await import(moduleUrl);

    if (mod && typeof mod === "object" && className in mod && typeof mod[className] === "function") {
      return true;
    }

    if ("default" in mod && typeof mod.default === "function" && mod.default.name === className) {
      return true;
    }

    return false;
  } catch (e) {
    logger().debug(e);
    return false;
  }
}
