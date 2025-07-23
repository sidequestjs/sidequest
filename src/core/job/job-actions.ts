import { Sidequest } from "src/sidequest";
import { JobData } from "../schema/job-data";

export class JobActions {
  static async setRunning(jobData: JobData): Promise<JobData>{
    const backend = Sidequest.getBackend();
    jobData.state = 'running';
    jobData.attempted_at = new Date();
    jobData.attempt = jobData.attempt + 1;
    return await backend.updateJob(jobData);
  }

  static async setComplete(jobData: JobData, result: any): Promise<JobData>{
    const backend = Sidequest.getBackend();
    jobData.completed_at = new Date();
    jobData.state = 'completed';
    jobData.result = result; 
    return await backend.updateJob(jobData);
  }

  static async setFailed(jobData: JobData, error: Error){
    const backend = Sidequest.getBackend();
     if(!jobData.errors){
        jobData.errors = [];
      }
      const errData = serializeError(error);
      errData.attempt = jobData.attempt;
      errData.attempted_at = jobData.attempted_at;
      errData.attempt_by = jobData.claimed_by;
      jobData.errors.push(errData);
      jobData.available_at = calculateBackoff(jobData.attempt);
      const max_attempts = jobData.max_attempts;
      if(jobData.attempt < max_attempts){
        jobData.state = 'pending';
      } else {
        jobData.state = 'discarded';
      }
      await backend.updateJob(jobData);
  }
}

function serializeError(err: Error): any {
  const plain = {
    name:    err.name,
    message: err.message,
    stack:   err.stack,
    ...Object.getOwnPropertyNames(err)
      .filter(k => !['name','message','stack'].includes(k))
      .reduce((acc, k) => {
        acc[k] = err[k];
        return acc;
      }, {})
  };
  return plain;
}


function calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 3600000): Date {
  const jitter = Math.random() + 0.5;
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, maxDelay);
  return new Date(Date.now() + delay);
}