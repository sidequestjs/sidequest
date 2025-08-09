import { Job, Sidequest } from "sidequest";

/**
 * A simple job that executes successfully
 */
export class SuccessJob extends Job {
  run(message) {
    return `Success: ${message}`;
  }
}

export class EnqueueFromWithinJob extends Job {
  run(message) {
    return Sidequest.build(SuccessJob).enqueue("Enqueued from within: " + message);
  }
}

/**
 * A job that fails on the first attempt, but succeeds on retry
 */
export class RetryJob extends Job {
  run(identifier) {
    if (this.attempt === 1) {
      throw new Error(`First attempt failed for ${identifier}`);
    }

    return `Success after retry: ${identifier}`;
  }
}

/**
 * A job that always fails
 */
export class FailingJob extends Job {
  run(message) {
    return this.fail("Failing job: " + message);
  }
}

/**
 * A job that times out (takes longer than configured timeout)
 */
export class TimeoutJob extends Job {
  run(delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Completed after ${delay}ms`);
      }, delay);
    });
  }
}
