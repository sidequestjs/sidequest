import { CompletedResult, RetryResult, SnoozeResult } from "@sidequest/core";
import { Job } from "./job";

export class DummyJob extends Job {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._optional) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(..._optional) {
    return "dummy job";
  }
}

describe("job.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should expose script and className correctly", async () => {
    const job = new DummyJob();
    await job.ready();
    expect(typeof job.script).toBe("string");
    expect(job.className).toBe("DummyJob");
  });

  it("creates a complete transition", () => {
    const job = new DummyJob();
    const transition = job.complete("foo bar");
    expect(transition.result).toBe("foo bar");
  });

  it("creates a fail transition", () => {
    const job = new DummyJob();
    const transition = job.fail("error");
    expect(transition.error).toEqual({ message: "error" });
  });

  it("creates a retry transition", () => {
    const job = new DummyJob();
    const transition = job.retry("reason", 1000);
    expect(transition.error).toEqual({ message: "reason" });
    expect(transition.delay).toEqual(1000);
  });

  it("creates a snooze transition", () => {
    const job = new DummyJob();
    const transition = job.snooze(1000);
    expect(transition.delay).toBe(1000);
  });

  it("fail/retry should accept an Error object", () => {
    const job = new DummyJob();
    const error = new Error("fail");
    expect(job.fail(error).error.message).toEqual("fail");
    expect(job.retry(error).error.message).toEqual("fail");
  });

  describe("perform", () => {
    it("should return CompleteResult if run returns a value", async () => {
      class ValueJob extends Job {
        run() {
          return "abc";
        }
      }
      const job = new ValueJob();
      const result = (await job.perform()) as CompletedResult;
      expect(result.type).toBe("completed");
      expect(result.result).toBe("abc");
    });

    it("should return the JobResult return by run", async () => {
      class TransitionJob extends Job {
        run() {
          return { __is_job_transition__: true, type: "snooze" } as SnoozeResult;
        }
      }
      const job = new TransitionJob();
      const result = (await job.perform()) as SnoozeResult;
      expect(result.type).toBe("snooze");
    });

    it("should return RetryResult if run throws", async () => {
      class ErrorJob extends Job {
        run() {
          throw new Error("fail!");
        }
      }
      const job = new ErrorJob();
      const result = (await job.perform()) as RetryResult;
      expect(result.type).toBe("retry");
      expect(result.error.message).toEqual("fail!");
    });

    it("should return RetryResult if run unhandled promise", async () => {
      class DummyUnhandled extends Job {
        run() {
          return new Promise(() => {
            throw new Error("unhandled error");
          });
        }
      }

      const job = new DummyUnhandled();
      const result = (await job.perform()) as RetryResult;
      expect(result.type).toBe("retry");
      expect(result.error.message).toEqual("unhandled error");
    });
  });
});
