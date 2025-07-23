import { SQLBackend } from "@sidequest/backend";
import baseTestSuite from "./base";

export let backend: SQLBackend;

export function testBackend<P>(config: P, backendFactory: (config: P) => SQLBackend) {
  beforeEach(async () => {
    backend = backendFactory(config);
    await backend.setup();
  });

  afterEach(async () => {
    await backend.truncate();
    await backend.close();
  });

  baseTestSuite();
}
