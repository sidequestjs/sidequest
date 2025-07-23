import { access } from "fs/promises";
import { pathToFileURL } from "url";

import {
  CompleteTransition,
  FailTransition,
  JobTransition,
  logger,
  RetryTransition,
  SnoozeTransition,
} from "@sidequest/core";

export type JobClassType = (new (...args: unknown[]) => Job) & { prototype: { run: (...args: unknown[]) => unknown } };

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

  snooze(delay: number) {
    return new SnoozeTransition(delay);
  }

  retry(reason: string | Error, delay?: number) {
    return new RetryTransition(reason, delay);
  }

  fail(reason: string | Error) {
    return new FailTransition(reason);
  }

  complete(result: unknown) {
    return new CompleteTransition(result);
  }

  async perform<T extends JobClassType>(...args: Parameters<T["prototype"]["run"]>): Promise<JobTransition> {
    try {
      const result = await this.run(...args);
      if (result instanceof JobTransition) {
        return result;
      }
      return new CompleteTransition(result);
    } catch (error) {
      logger().debug(error);
      return new RetryTransition(error as Error);
    }
  }

  abstract run(...args: unknown[]): unknown;
}

async function buildPath(className: string) {
  const err = new Error();
  let stackLines = err.stack?.split("\n") ?? [];
  stackLines = stackLines.slice(1);

  const filePaths = stackLines
    .map((line) => {
      const match = /(file:\/\/)?((\w:)?[/\\].+):\d+:\d+/.exec(line);
      if (match) {
        return match[2].replaceAll("\\", "/");
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
