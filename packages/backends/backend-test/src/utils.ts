import { existsSync, unlinkSync } from "fs";
import path from "path";

const TEST_DB = path.join(import.meta.dirname, "test.sqlite");

export function cleanupDb() {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
}
