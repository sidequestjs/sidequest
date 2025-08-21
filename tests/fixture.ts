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

    // We have to cleanup the backend here because if we cleanup in the backend fixture,
    // it won't be called when only the engine fixture is called directly.
    // This is a workaround for the fact that the backend fixture is not always used directly,
    // but the engine fixture is always used when only the backend is used directly.
    try {
      await engine.getBackend()?.truncate();
    } catch {
      // noop
    }

    await engine.close();
  },

  backend: async ({ engine }, use) => {
    const backend = engine.getBackend();
    if (!backend) {
      throw new Error("Backend is not configured");
    }

    await use(backend);
  },

  config: async ({ engine }, use) => {
    const config = engine.getConfig();
    if (!config) {
      throw new Error("Engine is not configured");
    }

    await use(config);
  },
});
