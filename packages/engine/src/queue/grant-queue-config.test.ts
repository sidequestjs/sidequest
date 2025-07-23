import { Backend } from "@sidequest/backend";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Engine, EngineConfig } from "../engine";
import { grantQueueConfig, QueueDefaults } from "./grant-queue-config";

describe("grantQueueConfig", () => {
  let backend: Backend;

  beforeAll(async () => {
    const dbLocation = ":memory:";
    const config: EngineConfig = { backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.close();
  });

  beforeEach(() => {
    // Reset backend for each test
    backend = Engine.getBackend()!;
  });

  afterEach(async () => {
    // Cleanup after each test
    await backend?.truncate();
  });

  it("returns creates a queue config", async () => {
    const config = await grantQueueConfig(backend, { name: "default", concurrency: 7 });

    expect(config?.id).toEqual(expect.any(Number) as number);
    expect(config?.name).toEqual("default");
    expect(config?.priority).toEqual(0);
    expect(config?.state).toEqual("active");
  });

  it("returns existing queue config", async () => {
    await grantQueueConfig(backend, { name: "default", concurrency: 7 });

    const config = await grantQueueConfig(backend, { name: "default" });

    expect(config?.id).toEqual(expect.any(Number) as number);
    expect(config?.name).toEqual("default");
    expect(config?.concurrency).toEqual(7);
    expect(config?.priority).toEqual(0);
    expect(config?.state).toEqual("active");
  });

  describe("defaults parameter", () => {
    it("uses defaults when queue parameter doesn't specify values", async () => {
      const defaults: QueueDefaults = {
        concurrency: 10,
        priority: 5,
        state: "paused",
      };

      const config = await grantQueueConfig(backend, { name: "test-defaults" }, defaults);

      expect(config?.name).toEqual("test-defaults");
      expect(config?.concurrency).toEqual(10);
      expect(config?.priority).toEqual(5);
      expect(config?.state).toEqual("paused");
    });

    it("queue parameter overrides defaults", async () => {
      const defaults: QueueDefaults = {
        concurrency: 10,
        priority: 5,
        state: "paused",
      };

      const config = await grantQueueConfig(
        backend,
        { name: "test-override", concurrency: 3, priority: 1, state: "active" },
        defaults,
      );

      expect(config?.name).toEqual("test-override");
      expect(config?.concurrency).toEqual(3); // overridden
      expect(config?.priority).toEqual(1); // overridden
      expect(config?.state).toEqual("active"); // overridden
    });

    it("partial queue parameter overrides only specified defaults", async () => {
      const defaults: QueueDefaults = {
        concurrency: 10,
        priority: 5,
        state: "paused",
      };

      const config = await grantQueueConfig(
        backend,
        { name: "test-partial", concurrency: 2 }, // only override concurrency
        defaults,
      );

      expect(config?.name).toEqual("test-partial");
      expect(config?.concurrency).toEqual(2); // overridden
      expect(config?.priority).toEqual(5); // from defaults
      expect(config?.state).toEqual("paused"); // from defaults
    });

    it("works without defaults parameter", async () => {
      const config = await grantQueueConfig(backend, { name: "no-defaults", concurrency: 1 });

      expect(config?.name).toEqual("no-defaults");
      expect(config?.concurrency).toEqual(1);
      // Should use backend defaults for unspecified values
    });

    it("empty defaults object doesn't affect queue creation", async () => {
      const emptyDefaults: Partial<QueueDefaults> = {};

      const config = await grantQueueConfig(
        backend,
        { name: "empty-defaults", concurrency: 3, priority: 2 },
        emptyDefaults,
      );

      expect(config?.name).toEqual("empty-defaults");
      expect(config?.concurrency).toEqual(3);
      expect(config?.priority).toEqual(2);
    });
  });

  describe("updating existing queue", () => {
    it("updates existing queue when configuration differs", async () => {
      // Create initial queue
      const initialConfig = await grantQueueConfig(backend, { name: "update-test", concurrency: 5 });
      expect(initialConfig?.concurrency).toEqual(5);

      // Update with different configuration
      const updatedConfig = await grantQueueConfig(backend, { name: "update-test", concurrency: 10 });
      expect(updatedConfig?.concurrency).toEqual(10);
      expect(updatedConfig?.id).toEqual(initialConfig?.id); // Same queue, just updated
    });

    it("updates existing queue with defaults when configuration differs", async () => {
      const defaults: QueueDefaults = {
        concurrency: 20,
        priority: 3,
        state: "active",
      };

      // Create initial queue without defaults
      const initialConfig = await grantQueueConfig(backend, { name: "update-defaults-test", concurrency: 5 });
      expect(initialConfig?.concurrency).toEqual(5);

      // Update with defaults and new values
      const updatedConfig = await grantQueueConfig(
        backend,
        { name: "update-defaults-test", priority: 7, state: "paused" }, // only specify priority
        defaults,
      );

      expect(updatedConfig?.concurrency).toEqual(5); // unchanged from initial
      expect(updatedConfig?.priority).toEqual(7); // overridden
      expect(updatedConfig?.state).toEqual("paused"); // from defaults
      expect(updatedConfig?.id).toEqual(initialConfig?.id); // Same queue
    });

    it("doesn't update when existing configuration matches", async () => {
      // Create initial queue
      const initialConfig = await grantQueueConfig(backend, {
        name: "no-update-test",
        concurrency: 5,
        priority: 2,
        state: "active",
      });

      // Try to "update" with same configuration
      const sameConfig = await grantQueueConfig(backend, {
        name: "no-update-test",
        concurrency: 5,
        priority: 2,
        state: "active",
      });

      expect(sameConfig?.id).toEqual(initialConfig?.id);
      expect(sameConfig?.concurrency).toEqual(5);
      expect(sameConfig?.priority).toEqual(2);
      expect(sameConfig?.state).toEqual("active");
    });
  });
});
