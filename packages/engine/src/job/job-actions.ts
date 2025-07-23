import { JobData } from "@sidequest/core";
import { Engine } from "../engine";

export class JobActions {
  static async setRunning(jobData: JobData): Promise<JobData> {
    const backend = Engine.getBackend();
    jobData.state = "running";
    jobData.attempted_at = new Date();
    jobData.attempt = jobData.attempt + 1;
    return await backend.updateJob(jobData);
  }

  static async setComplete(jobData: JobData, result: unknown): Promise<JobData> {
    const backend = Engine.getBackend();
    jobData.completed_at = new Date();
    jobData.state = "completed";
    jobData.result = result;
    return await backend.updateJob(jobData);
  }

  static async setExecutionFailed(jobData: JobData, error: Error) {
    const backend = Engine.getBackend();
    jobData.errors ??= [];
    const errData = {
      ...serializeError(error),
      attempt: jobData.attempt,
      attempted_at: jobData.attempted_at,
      attempt_by: jobData.claimed_by,
    };
    jobData.errors.push(errData);
    jobData.available_at = calculateBackoff(jobData.attempt);
    const max_attempts = jobData.max_attempts;
    if (jobData.attempt < max_attempts) {
      jobData.state = "waiting";
    } else {
      jobData.state = "failed";
    }
    await backend.updateJob(jobData);
  }
}

function calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 3600000): Date {
  const jitter = Math.random() + 0.5;
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, maxDelay);
  return new Date(Date.now() + delay);
}

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  [key: string]: unknown; // allow custom fields declared on extended errors
};

/**
 * Generate serializable errors.
 * Error objects are not fully serializable by default because their fields are not enumerable.
 * For example:
 *   const err = new Error("my error");
 *   const foo = { ...err };        // foo is {}
 *   JSON.stringify(err);           // returns '{}'
 * This function extracts all own properties, making the error serializable for logs and transport.
 */
function serializeError(err: Error): SerializedError{
  const plain = {
    name:    err.name,
    message: err.message,
    stack:   err.stack,
    ...Object.getOwnPropertyNames(err)
      .filter(k => !['name','message','stack'].includes(k))
      .reduce((acc, k) => {
        acc[k] = err[k] as unknown;
        return acc;
      }, {})
  };
  return plain;
}