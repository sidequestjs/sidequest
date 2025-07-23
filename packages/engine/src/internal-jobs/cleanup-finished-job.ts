import { Engine, Job } from "../engine";

const oneMonth = 30 * 24 * 60 * 60 * 1000;

export class CleanupFinishedJobs extends Job {
  async run(): Promise<void> {
    const backend = Engine.getBackend();
    const cutoffDate = new Date(Date.now() - oneMonth);
    await backend?.deleteFinishedJobs(cutoffDate);
  }
}
