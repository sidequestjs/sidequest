import { Job } from "../engine";

export class DummyJob extends Job {
  run() {
    throw new Error("failed job");
  }
}
