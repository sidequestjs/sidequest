import { Job } from "../sidequest";

export class DummyJob extends Job {
  run(): any {
    return "dummy job";
  }
}
