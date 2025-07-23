import { JobData } from "../schema";
import { CompleteTransition } from "./complete-transition";

describe("CompleteTransition", () => {
  let jobData: JobData;
  beforeEach(() => {
    jobData = {
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      state: "running",
      args: [],
      constructor_args: [],
      attempt: 1,
      max_attempts: 10,
    } as unknown as JobData;
  });

  it("sets job data as complete", () => {
    expect(new CompleteTransition("result").apply(jobData)).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      max_attempts: 10,
      completed_at: expect.any(Date) as Date,
      state: "completed",
      result: "result",
    });
  });
});
