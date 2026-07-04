/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { mockBackend, zeroCounts } from "../testing/mock-backend";
import { OverviewService, rangeToMs } from "./overview-service";

describe("rangeToMs", () => {
  it("defaults to 12 minutes and maps known ranges", () => {
    expect(rangeToMs()).toBe(12 * 60 * 1000);
    expect(rangeToMs("12m")).toBe(12 * 60 * 1000);
    expect(rangeToMs("12h")).toBe(12 * 60 * 60 * 1000);
    expect(rangeToMs("12d")).toBe(12 * 24 * 60 * 60 * 1000);
    expect(rangeToMs("bogus")).toBe(12 * 60 * 1000);
  });
});

describe("OverviewService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses windowed counts but all-time waiting/running", async () => {
    const backend = mockBackend({
      countJobs: vi
        .fn()
        .mockResolvedValueOnce({ ...zeroCounts(), total: 5, completed: 4, waiting: 1, running: 1 }) // windowed
        .mockResolvedValueOnce({ ...zeroCounts(), total: 50, completed: 40, waiting: 10, running: 3 }), // all-time
    });

    const stats = await new OverviewService(backend).counts("12h");

    expect(stats).toMatchObject({ total: 5, completed: 4, waiting: 10, running: 3 });
    expect(backend.countJobs).toHaveBeenNthCalledWith(1, { from: expect.any(Date) });
    expect(backend.countJobs).toHaveBeenNthCalledWith(2);
  });

  it("proxies the time series with a default range", async () => {
    const backend = mockBackend({ countJobsOverTime: vi.fn().mockResolvedValue([{ timestamp: new Date() }]) });
    await new OverviewService(backend).timeseries();
    expect(backend.countJobsOverTime).toHaveBeenCalledWith("12m");
  });
});
