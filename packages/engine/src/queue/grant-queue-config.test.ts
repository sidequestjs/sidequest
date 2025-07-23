import { describe, it } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { grantQueueConfig } from "./grant-queue-config";

describe("grantQueueConfig", () => {
  beforeAll(async () => {
    const dbLocation = ":memory:";
    const config: SidequestConfig = { backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.getBackend()?.close();
  });

  it("returns creates a queue config", async () => {
    const config = await grantQueueConfig("default", { name: "default", concurrency: 7 });

    expect(config?.id).toEqual(expect.any(Number) as number);
    expect(config?.name).toEqual("default");
    expect(config?.priority).toEqual(0);
    expect(config?.state).toEqual("active");
  });

  it("returns existing queue config", async () => {
    await grantQueueConfig("default", { name: "default", concurrency: 7 });

    const config = await grantQueueConfig("default");

    expect(config?.id).toEqual(expect.any(Number) as number);
    expect(config?.name).toEqual("default");
    expect(config?.concurrency).toEqual(7);
    expect(config?.priority).toEqual(0);
    expect(config?.state).toEqual("active");
  });
});
