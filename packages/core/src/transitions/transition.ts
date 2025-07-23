import { JobData } from "../schema";

export abstract class JobTransition {
  abstract apply(job: JobData): JobData;
}
