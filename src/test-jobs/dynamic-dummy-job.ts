import { Job } from "../sidequest";

export class DynamicDummyJob extends Job {
  async run(): Promise<any> {
    await new Promise((r) => {
      setTimeout(r, 800);
    });
    return "dummy job";
  }
}
