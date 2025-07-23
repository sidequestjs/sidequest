import { JobClassType } from "../job/job";

export interface DeduplicationStrategy {
  getDigest<T extends JobClassType>(
    JobClass: T,
    constructorArgs: ConstructorParameters<T>,
    args: Parameters<T["prototype"]["run"]>,
  ): string;
}
