import { JobData } from "../schema";

export interface UniquenessConfig {
  type: string;
}

export interface Uniqueness<Config = UniquenessConfig> {
  config: Config;
  digest(jobData: JobData): string | null;
}
