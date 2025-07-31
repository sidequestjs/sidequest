import { Job } from "sidequest";

export class SnoozeJob extends Job {
  run() {
    // Pauses the job for 10 seconds before retrying — can be used to wait for external conditions.
    return this.snooze(10_000);
  }
}
