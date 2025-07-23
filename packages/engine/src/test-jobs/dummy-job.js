import { Job } from "../engine";

export class DummyJob extends Job {
  run() {
    return "dummy job";
  }
}
