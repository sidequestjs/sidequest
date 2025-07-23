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

  static async setFailed(jobData: JobData, error: Error) {
    const backend = Engine.getBackend();
    jobData.errors ??= [];
    const errData = {
      ...error,
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
