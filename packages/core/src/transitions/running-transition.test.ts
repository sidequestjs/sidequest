import { JobData } from "../schema";
import { RunningTransition } from "./running-transition";

describe("RunningTransition", () => {
  let jobData: JobData;
  beforeEach(() => {
    jobData = {
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      state: "waiting",
      args: [],
      constructor_args: [],
      attempt: 1,
      max_attempts: 10,
    };
  });

  it("sets job data as running", () => {
    expect(new RunningTransition().apply(jobData)).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 2,
      max_attempts: 10,
      attempted_at: expect.any(Date) as Date,
      state: "running",
    });
  });
});
