import { JobData } from "../schema";
import { RunTransition } from "./run-transition";

describe("RunTransition", () => {
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
    } as unknown as JobData;
  });

  it("sets job data as running", () => {
    expect(new RunTransition().apply(jobData)).toEqual({
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
