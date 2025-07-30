import { Job } from "@sidequest/core";

export class DummyJob extends Job {
  run() {
    throw new Error("failed job");
  }
}
