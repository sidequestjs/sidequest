/* eslint-disable @typescript-eslint/unbound-method */
import type { JobData } from "@sidequest/core";
import { createApiApp } from "./app";
import { mockBackend, zeroCounts } from "./testing/mock-backend";

vi.mock("@sidequest/engine", () => ({
  JobTransitioner: { apply: vi.fn((_backend, job: JobData) => Promise.resolve({ ...job, state: "waiting" })) },
}));

describe("createApiApp", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("GET /jobs", () => {
    it("returns the list and pagination metadata", async () => {
      const backend = mockBackend({
        listJobs: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // the page
          .mockResolvedValueOnce([{ id: 3 }]), // next-page probe
      });
      const res = await createApiApp({ backend }).request("/jobs?pageSize=2");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        jobs: [{ id: 1 }, { id: 2 }],
        pagination: { page: 1, pageSize: 2, hasNextPage: true },
      });
    });

    it("reports hasNextPage false when the probe is empty", async () => {
      const backend = mockBackend({
        listJobs: vi.fn().mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]),
      });
      const res = await createApiApp({ backend }).request("/jobs");
      const body = (await res.json()) as { pagination: { hasNextPage: boolean } };
      expect(body.pagination.hasNextPage).toBe(false);
    });
  });

  it("GET /jobs/meta returns distinct queue names", async () => {
    const backend = mockBackend({ getQueuesFromJobs: vi.fn().mockResolvedValue(["email"]) });
    const res = await createApiApp({ backend }).request("/jobs/meta");
    expect(await res.json()).toEqual({ queues: ["email"] });
  });

  it("GET /jobs/:id returns the job, or 404 when missing", async () => {
    const found = mockBackend({ getJob: vi.fn().mockResolvedValue({ id: 7 }) });
    expect(await (await createApiApp({ backend: found }).request("/jobs/7")).json()).toEqual({ id: 7 });

    const missing = mockBackend({ getJob: vi.fn().mockResolvedValue(undefined) });
    const res = await createApiApp({ backend: missing }).request("/jobs/7");
    expect(res.status).toBe(404);
  });

  it("POST /jobs/:id/cancel applies the transition", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue({ id: 1, state: "waiting" }) });
    const res = await createApiApp({ backend }).request("/jobs/1/cancel", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("maps a not-found mutation to a 404 JSON error", async () => {
    const backend = mockBackend({ getJob: vi.fn().mockResolvedValue(undefined) });
    const res = await createApiApp({ backend }).request("/jobs/1/cancel", { method: "POST" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Job 1 not found" });
  });

  it("GET /queues returns queues with counts", async () => {
    const backend = mockBackend({
      listQueues: vi.fn().mockResolvedValue([{ name: "email", state: "active" }]),
      countJobsByQueues: vi.fn().mockResolvedValue({ email: { total: 2 } }),
    });
    const res = await createApiApp({ backend }).request("/queues");
    expect(await res.json()).toEqual([{ name: "email", state: "active", jobs: { total: 2 } }]);
  });

  it("POST /queues/:name/toggle flips the state", async () => {
    const backend = mockBackend({ getQueue: vi.fn().mockResolvedValue({ name: "email", state: "active" }) });
    const res = await createApiApp({ backend }).request("/queues/email/toggle", { method: "POST" });
    expect(await res.json()).toMatchObject({ state: "paused" });
  });

  it("GET /overview returns counts", async () => {
    const backend = mockBackend({ countJobs: vi.fn().mockResolvedValue({ ...zeroCounts(), total: 9 }) });
    const res = await createApiApp({ backend }).request("/overview?range=12h");
    const body = (await res.json()) as { total: number };
    expect(body.total).toBe(9);
  });

  it("GET /overview/timeseries proxies the backend", async () => {
    const backend = mockBackend({ countJobsOverTime: vi.fn().mockResolvedValue([{ timestamp: "t", total: 1 }]) });
    const res = await createApiApp({ backend }).request("/overview/timeseries?range=12h");
    expect(await res.json()).toEqual([{ timestamp: "t", total: 1 }]);
    expect(backend.countJobsOverTime).toHaveBeenCalledWith("12h");
  });
});
