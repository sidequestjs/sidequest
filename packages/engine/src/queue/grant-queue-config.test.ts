import { sidequestTest } from "@/tests/fixture";
import { describe, expect } from "vitest";
import { grantQueueConfig, QueueDefaults } from "./grant-queue-config";

describe("grantQueueConfig", () => {
  sidequestTest("returns creates a queue config", async ({ backend }) => {
    const config = await grantQueueConfig(backend, { name: "default", concurrency: 7 });

    expect(config?.id).toEqual(expect.any(Number) as number);
    expect(config?.name).toEqual("default");
    expect(config?.priority).toEqual(0);
    expect(config?.state).toEqual("active");
  });

  sidequestTest("returns existing queue config", async ({ backend }) => {
    await grantQueueConfig(backend, { name: "default", concurrency: 7 });

    const config = await grantQueueConfig(backend, { name: "default" });

    expect(config?.id).toEqual(expect.any(Number) as number);
    expect(config?.name).toEqual("default");
    expect(config?.concurrency).toEqual(7);
    expect(config?.priority).toEqual(0);
    expect(config?.state).toEqual("active");
  });

  describe("defaults parameter", () => {
    sidequestTest("uses defaults when queue parameter doesn't specify values", async ({ backend }) => {
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

    sidequestTest("queue parameter overrides defaults", async ({ backend }) => {
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

    sidequestTest("partial queue parameter overrides only specified defaults", async ({ backend }) => {
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

    sidequestTest("works without defaults parameter", async ({ backend }) => {
      const config = await grantQueueConfig(backend, { name: "no-defaults", concurrency: 1 });

      expect(config?.name).toEqual("no-defaults");
      expect(config?.concurrency).toEqual(1);
      // Should use backend defaults for unspecified values
    });

    sidequestTest("empty defaults object doesn't affect queue creation", async ({ backend }) => {
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
    sidequestTest("updates existing queue when configuration differs", async ({ backend }) => {
      // Create initial queue
      const initialConfig = await grantQueueConfig(backend, { name: "update-test", concurrency: 5 });
      expect(initialConfig?.concurrency).toEqual(5);

      // Update with different configuration
      const updatedConfig = await grantQueueConfig(backend, { name: "update-test", concurrency: 10 }, undefined, true);
      expect(updatedConfig?.concurrency).toEqual(10);
      expect(updatedConfig?.id).toEqual(initialConfig?.id); // Same queue, just updated
    });

    sidequestTest(
      "does not update existing queue when configuration differs and forceUpdate is false",
      async ({ backend }) => {
        // Create initial queue
        const initialConfig = await grantQueueConfig(backend, { name: "update-test", concurrency: 5 });
        expect(initialConfig?.concurrency).toEqual(5);

        // Update with different configuration
        const updatedConfig = await grantQueueConfig(
          backend,
          { name: "update-test", concurrency: 10 },
          undefined,
          false,
        );
        expect(updatedConfig?.concurrency).toEqual(5);
        expect(updatedConfig?.id).toEqual(initialConfig?.id); // Same queue, just updated
      },
    );

    sidequestTest("updates existing queue with defaults when configuration differs", async ({ backend }) => {
      const defaults: QueueDefaults = {
        concurrency: 20,
        priority: 3,
        state: "active",
      };

      // Create initial queue without defaults
      const initialConfig = await grantQueueConfig(
        backend,
        { name: "update-defaults-test", concurrency: 5 },
        undefined,
        true,
      );
      expect(initialConfig?.concurrency).toEqual(5);

      // Update with defaults and new values
      const updatedConfig = await grantQueueConfig(
        backend,
        { name: "update-defaults-test", priority: 7, state: "paused" }, // only specify priority
        defaults,
        true,
      );

      expect(updatedConfig?.concurrency).toEqual(5); // unchanged from initial
      expect(updatedConfig?.priority).toEqual(7); // overridden
      expect(updatedConfig?.state).toEqual("paused"); // from defaults
      expect(updatedConfig?.id).toEqual(initialConfig?.id); // Same queue
    });

    sidequestTest("doesn't update when existing configuration matches", async ({ backend }) => {
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

  sidequestTest("throws error if queue concurrency is less than 1", async ({ backend }) => {
    await expect(() =>
      grantQueueConfig(backend, { name: "invalid-concurrency", concurrency: 0 })
    ).rejects.toThrowError('Invalid concurrency value for queue "invalid-concurrency": must be at least 1.');
  });
});
