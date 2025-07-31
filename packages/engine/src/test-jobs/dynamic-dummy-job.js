import { Job } from "@sidequest/core";

export class DynamicDummyJob extends Job {
  async run() {
    await new Promise((r) => {
      setTimeout(r, 800);
    });
    return "dummy job";
  }
}
