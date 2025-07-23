import { Engine, Job, SidequestConfig } from "../engine";

const oneMonth = 30 * 24 * 60 * 60 * 1000;

export class CleanupFinishedJobs extends Job {
  config: SidequestConfig;

  constructor(config: SidequestConfig) {
    super();
    this.config = config;
  }

  async run(): Promise<void> {
    if (!Engine.getConfig()) {
      await Engine.configure(this.config);
    }
    const backend = Engine.getBackend();
    const cutoffDate = new Date(Date.now() - oneMonth);
    await backend?.deleteFinishedJobs(cutoffDate);
  }
}
