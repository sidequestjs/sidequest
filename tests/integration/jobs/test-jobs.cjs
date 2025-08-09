// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Job } = require("sidequest");

/**
 * A simple job that executes successfully
 */
class SuccessJob extends Job {
  run(message) {
    return `Success: ${message}`;
  }
}

/**
 * A job that fails on the first attempt, but succeeds on retry
 */
class RetryJob extends Job {
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
class FailingJob extends Job {
  run(message) {
    return this.fail("Failing job: " + message);
  }
}

/**
 * A job that times out (takes longer than configured timeout)
 */
class TimeoutJob extends Job {
  run(delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Completed after ${delay}ms`);
      }, delay);
    });
  }
}

module.exports = {
  SuccessJob,
  RetryJob,
  FailingJob,
  TimeoutJob,
};
