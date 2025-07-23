import { Job } from "../job";

export class DummyJob extends Job {
  run() {
    throw new Error("failed job");
  }
}
