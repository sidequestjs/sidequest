import { Job } from "sidequest";

export class MyJob extends Job {
  async run() {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    return { test: true };
  }
}
