import { JobData, RunningTransition } from "@sidequest/core";
import { Engine } from "../engine";
import { JobTransitioner } from "./job-transitioner";

describe("JobTransitioner", () => {
  let jobData: JobData;

  beforeAll(async () => {
    await Engine.configure({});
  });

  afterAll(async () => {
    await Engine.getBackend()?.close();
  });

  beforeEach(async () => {
    jobData = await Engine.getBackend().insertJob({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      max_attempts: 10,
    });
  });

  it("applies a transition and saves the updated jobData", async () => {
    await JobTransitioner.apply(jobData, new RunningTransition());
    const updatedJobData = await Engine.getBackend().getJob(jobData.id ?? 0);
    expect(updatedJobData.state).toEqual("running");
    expect(updatedJobData.attempt).toEqual(2);
  });
});
