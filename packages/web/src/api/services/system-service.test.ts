import { mockBackend } from "../testing/mock-backend";
import { SystemService } from "./system-service";

describe("SystemService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports connected with the configured driver and version", async () => {
    const backend = mockBackend({ listQueues: vi.fn().mockResolvedValue([]) });
    const info = await new SystemService(backend, { version: "1.2.3", driver: "@sidequest/sqlite-backend" }).info();
    expect(info).toEqual({ version: "1.2.3", driver: "@sidequest/sqlite-backend", connected: true });
  });

  it("reports disconnected when the backend probe throws, with no driver/version by default", async () => {
    const backend = mockBackend({ listQueues: vi.fn().mockRejectedValue(new Error("down")) });
    const info = await new SystemService(backend).info();
    expect(info).toEqual({ version: undefined, driver: undefined, connected: false });
  });
});
