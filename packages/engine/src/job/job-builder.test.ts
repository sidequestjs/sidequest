import { Engine } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";
import { JobBuilder } from "./job-builder";

describe("JobBuilder", () => {
  beforeAll(async () => {
    await Engine.configure({});
  });

  afterAll(async () => {
    await Engine.getBackend()?.close();
  });

  test("enqueues a job at default queue", async () => {
    const jobData = await new JobBuilder(DummyJob).enqueue();
    expect(jobData).toEqual(
      expect.objectContaining({
        queue: "default",
        class: "DummyJob",
        script: expect.stringMatching(/dummy-job\.js$/) as string,
        args: [],
        constructor_args: [],
        state: "waiting",
        available_at: expect.any(String) as string,
        inserted_at: expect.any(String) as string,
        attempted_at: null,
        completed_at: null,
        failed_at: null,
        cancelled_at: null,
        claimed_at: null,
        claimed_by: null,
        attempt: 0,
        max_attempts: 5,
        timeout: null,
      }),
    );
  });

  test("enqueues a job setting queue", async () => {
    const jobData = await new JobBuilder(DummyJob).queue("custom_queue").enqueue();
    expect(jobData.queue).toEqual("custom_queue");
  });

  test("enqueues a job setting timeout", async () => {
    const jobData = await new JobBuilder(DummyJob).timeout(100).enqueue();
    expect(jobData.timeout).toEqual(100);
  });

  test("enqueues a job setting args", async () => {
    const jobData = await new JobBuilder(DummyJob).enqueue("foo", "bar");
    expect(jobData.args).toEqual(["foo", "bar"]);
  });

  test("enqueues a job setting constructor args", async () => {
    const jobData = await new JobBuilder(DummyJob).with("foo", "bar").enqueue();
    expect(jobData.constructor_args).toEqual(["foo", "bar"]);
  });
});
