export type JobClassType = (new (...args: unknown[]) => Job) & { prototype: { run: (...args: unknown[]) => unknown } };

export abstract class Job {
  private _script: string;

  constructor() {
    /* IMPORTANT: the build path resolution must be called here.
     * This is important to ensure the path resolution is returning the Job implementation.
     */
    this._script = buildPath();
  }

  get script() {
    return this._script;
  }

  get className() {
    return this.constructor.name;
  }

  abstract run(...args: unknown[]): unknown;
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
    return `file://${match[2].replaceAll("\\", "/")}`;
  }

  throw new Error("Could not determine the task path");
}
