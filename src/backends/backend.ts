import { Job } from "src/sidequest";

export interface Backend {
  setup(): Promise<void> | void;
  close():  Promise<void> | void;

  insertJob(job: Job, args: any[]): void | Promise<void>;
  claimPendingJob(queue: string): Promise<any>;
}