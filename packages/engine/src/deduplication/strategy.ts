import { JobClassType } from "../job/job";

export interface DeduplicationStrategy {
  isDuplicated<T extends JobClassType>(JobClass: T, args: Parameters<T["prototype"]["run"]>): Promise<boolean>;
}
