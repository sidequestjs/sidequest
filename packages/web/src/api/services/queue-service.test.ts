/* eslint-disable @typescript-eslint/unbound-method */
import type { QueueConfig } from "@sidequest/core";
import { QueueNotFoundError } from "../errors";
import { mockBackend } from "../testing/mock-backend";
import { QueueService } from "./queue-service";

const queue = (over: Partial<QueueConfig> = {}) => ({ name: "email", state: "active", ...over }) as QueueConfig;

describe("QueueService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("annotates each queue with its job counts, ordered by name", async () => {
    const backend = mockBackend({
      listQueues: vi.fn().mockResolvedValue([queue()]),
      countJobsByQueues: vi.fn().mockResolvedValue({ email: { total: 3 } }),
    });
    const [row] = await new QueueService(backend).list();
    expect(row).toMatchObject({ name: "email", jobs: { total: 3 } });
    expect(backend.listQueues).toHaveBeenCalledWith({ column: "name", order: "asc" });
  });

  it("toggles an active queue to paused", async () => {
    const backend = mockBackend({ getQueue: vi.fn().mockResolvedValue(queue({ state: "active" })) });
    await expect(new QueueService(backend).toggle("email")).resolves.toMatchObject({ state: "paused" });
  });

  it("toggles a paused queue to active", async () => {
    const backend = mockBackend({ getQueue: vi.fn().mockResolvedValue(queue({ state: "paused" })) });
    await expect(new QueueService(backend).toggle("email")).resolves.toMatchObject({ state: "active" });
  });

  it("throws QueueNotFoundError for a missing queue", async () => {
    const backend = mockBackend({ getQueue: vi.fn().mockResolvedValue(undefined) });
    await expect(new QueueService(backend).toggle("nope")).rejects.toBeInstanceOf(QueueNotFoundError);
  });
});
