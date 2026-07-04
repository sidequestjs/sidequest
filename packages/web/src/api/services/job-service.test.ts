/* eslint-disable @typescript-eslint/unbound-method */
import type { JobData } from "@sidequest/core";
import { CancelTransition, RerunTransition, SnoozeTransition } from "@sidequest/core";
import { JobTransitioner } from "@sidequest/engine";
import { JobNotFoundError } from "../errors";
import { mockBackend } from "../testing/mock-backend";
import { JobService } from "./job-service";

vi.mock("@sidequest/engine", () => ({
  JobTransitioner: { apply: vi.fn((_backend, job: JobData) => Promise.resolve(job)) },
}));

const job = (over: Partial<JobData> = {}) => ({ id: 1, state: "waiting", ...over }) as JobData;

describe("JobService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists jobs through the backend", async () => {
    const backend = mockBackend({ listJobs: vi.fn().mockResolvedValue([job()]) });
    await expect(new JobService(backend).list({ queue: "email" })).resolves.toEqual([job()]);
    expect(backend.listJobs).toHaveBeenCalledWith({ queue: "email" });
  });

  it("gets a job by id", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue(job()) });
    await expect(new JobService(backend).get(1)).resolves.toEqual(job());
    expect(backend.getJob).toHaveBeenCalledWith(1);
  });

  it("returns distinct queue names", async () => {
    const backend = mockBackend({ getQueuesFromJobs: vi.fn().mockResolvedValue(["email", "default"]) });
    await expect(new JobService(backend).queueNames()).resolves.toEqual(["email", "default"]);
  });

  it("cancels via a CancelTransition", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue(job()) });
    await new JobService(backend).cancel(1);
    expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, job(), expect.any(CancelTransition));
  });

  it("reruns via a RerunTransition", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue(job()) });
    await new JobService(backend).rerun(1);
    expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, job(), expect.any(RerunTransition));
  });

  it("run() snoozes a non-canceled job to zero", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue(job({ state: "failed" })) });
    await new JobService(backend).run(1);
    expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, expect.anything(), expect.any(SnoozeTransition));
  });

  it("run() reruns a canceled job", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue(job({ state: "canceled" })) });
    await new JobService(backend).run(1);
    expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, expect.anything(), expect.any(RerunTransition));
  });

  it("throws JobNotFoundError when the job is missing", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue(undefined) });
    await expect(new JobService(backend).cancel(99)).rejects.toBeInstanceOf(JobNotFoundError);
  });
});
