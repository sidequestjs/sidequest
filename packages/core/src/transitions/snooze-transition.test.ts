import { JobData } from "../schema";
import { SnoozeTransition } from "./snooze-transition";

describe("SnoozeTransition", () => {
  let jobData: JobData;
  beforeEach(() => {
    jobData = {
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      max_attempts: 10,
    };
  });

  it("snoozes a job", () => {
    const result = new SnoozeTransition(3600000).apply(jobData);
    const inAlmostOneHour = new Date();
    inAlmostOneHour.setTime(inAlmostOneHour.getTime() - 3600000 - 300);
    expect(result).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 10,
      available_at: expect.any(Date) as Date,
      state: "waiting",
    });
    expect(result.available_at?.getTime()).toBeGreaterThanOrEqual(inAlmostOneHour.getTime());
  });

  it("snoozes a job without decrementing attempt when attempt was 0", () => {
    jobData.attempt = 0;
    const result = new SnoozeTransition(3600000).apply(jobData);
    const inAlmostOneHour = new Date();
    inAlmostOneHour.setTime(inAlmostOneHour.getTime() - 3600000 - 300);
    expect(result).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 10,
      available_at: expect.any(Date) as Date,
      state: "waiting",
    });
    expect(result.available_at?.getTime()).toBeGreaterThanOrEqual(inAlmostOneHour.getTime());
  });
});
