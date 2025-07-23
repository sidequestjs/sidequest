import { Engine, EngineConfig } from "../engine";
import { cleanupFinishedJobs } from "./cleanup-finished-job";

describe("cleanup-finished-job.ts", () => {
  const dbLocation = ":memory:";
  const config: EngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
  });

  afterEach(async () => {
    await Engine.close();
  });

  it("deletes old finished jobs", async () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 32);

    const backend = Engine.getBackend()!;

    let inserted = await backend.createNewJob({
      state: "waiting",
      queue: "default",
      script: "script.js",
      class: "DummyJob",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 5,
    });
    await backend.updateJob({
      id: inserted.id,
      state: "completed",
      attempt: 1,
      completed_at: oneMonthAgo,
    });

    inserted = await backend.createNewJob({
      state: "waiting",
      queue: "default",
      script: "script.js",
      class: "DummyJob",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 5,
    });
    await backend.updateJob({
      id: inserted.id,
      state: "failed",
      attempt: 5,
      failed_at: oneMonthAgo,
    });

    inserted = await backend.createNewJob({
      state: "waiting",
      queue: "default",
      script: "script.js",
      class: "DummyJob",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 5,
    });
    await backend.updateJob({
      id: inserted.id,
      state: "canceled",
      canceled_at: oneMonthAgo,
    });

    await cleanupFinishedJobs(backend, 30 * 24 * 60 * 60 * 1000); // 30 days

    const jobs = await backend.listJobs({ state: ["canceled", "failed", "completed"] });

    expect(jobs).toHaveLength(0);
  });
});
