import { Job } from "@sidequest/core";

/**
 * A job that honors `this.abortSignal`: it waits until aborted and reports the abort reason.
 * Used to verify cooperative cancellation/timeout end-to-end through the runner.
 */
export class AbortAwareJob extends Job {
  async run() {
    if (this.abortSignal.aborted) {
      return this.fail(`aborted before start: ${this.abortSignal.reason?.name}`);
    }

    await new Promise((resolve) => {
      this.abortSignal.addEventListener("abort", resolve, { once: true });
    });

    return this.fail(`aborted: ${this.abortSignal.reason?.name}`);
  }
}
