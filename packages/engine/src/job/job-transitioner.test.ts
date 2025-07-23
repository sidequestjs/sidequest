import { JobData, RunningTransition } from "@sidequest/core";
import { Engine, SidequestConfig } from "../engine";
import { JobTransitioner } from "./job-transitioner";

describe("JobTransitioner", () => {
  let jobData: JobData;

  beforeAll(async () => {
    const dbLocation = ":memory:";
    const config: SidequestConfig = { backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.getBackend()?.close();
  });

  beforeEach(async () => {
    jobData = await Engine.getBackend()!.createNewJob({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      state: "waiting",
      args: [],
      constructor_args: [],
      attempt: 1 as unknown as 0,
      max_attempts: 10,
    });
  });

  it("applies a transition and saves the updated jobData", async () => {
    await JobTransitioner.apply(jobData, new RunningTransition());
    const updatedJobData = await Engine.getBackend()!.getJob(jobData.id ?? 0);
    expect(updatedJobData.state).toEqual("running");
    expect(updatedJobData.attempt).toEqual(2);
  });
});
