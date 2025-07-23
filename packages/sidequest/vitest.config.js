import path from "path";
import { defineConfig } from "vitest/config";
import { createVitestConfig } from "../../vitest.base.config";

export default defineConfig(createVitestConfig(["../../tests/vitest.setup.ts"], path.resolve("..", "..", "./tests")));
