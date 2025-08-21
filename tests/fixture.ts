import { unlinkSync } from "fs";
import { test as baseTest } from "vitest";
import { Backend } from "../packages/backends/backend/src";
import { Engine, NonNullableEngineConfig } from "../packages/engine/src";

export interface SidequestTestFixture {
  engine: Engine;
  backend: Backend;
  config: NonNullableEngineConfig;
}

export const sidequestTest = baseTest.extend<SidequestTestFixture>({
  // eslint-disable-next-line no-empty-pattern
  engine: async ({}, use) => {
    const engine = new Engine();
    await engine.configure({
      backend: { driver: "@sidequest/sqlite-backend", config: "./sidequest.sqlite" },
    });

    await use(engine);

    await engine.close();
  },

  backend: async ({ engine }, use) => {
    const backend = engine.getBackend();
    if (!backend) {
      throw new Error("Backend is not configured");
    }

    await use(backend);

    try {
      await backend.truncate();
      unlinkSync("./sidequest.sqlite");
    } catch {
      // noop
    }
  },

  config: async ({ engine }, use) => {
    const config = engine.getConfig();
    if (!config) {
      throw new Error("Engine is not configured");
    }

    await use(config);
  },
});
