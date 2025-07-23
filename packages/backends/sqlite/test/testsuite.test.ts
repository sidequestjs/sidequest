import { testBackend } from "@sidequest/backend-test";
import { logger } from "@sidequest/core";
import { unlink } from "fs/promises";
import path from "path";
import SqliteBackend from "../src/sqlite-backend";

const dbFile = "test.sqlite";

await unlink(dbFile).catch(() => {
  logger().info("All good, test db file does not exists");
});

testBackend(() => new SqliteBackend(path.join(import.meta.dirname, dbFile)));
