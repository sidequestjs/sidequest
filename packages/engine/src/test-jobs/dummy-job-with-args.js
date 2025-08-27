import { Job } from "@sidequest/core";

export class DummyJobWithArgs extends Job {
  constructor(arg1, arg2) {
    super();
    this.arg1 = arg1;
    this.arg2 = arg2;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(..._optional) {
    return "dummy job";
  }
}
