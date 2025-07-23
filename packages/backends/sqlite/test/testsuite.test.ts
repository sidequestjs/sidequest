import { testBackend } from "@sidequest/backend-test";
import path from "path";
import SqliteBackend from "../src/sqlite-backend";

testBackend(() => new SqliteBackend(path.join(import.meta.dirname, "test.sqlite")));
