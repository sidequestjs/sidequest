import { testBackend } from "@sidequest/backend-test";
import PostgresBackend from "../src/postgres-backend";

const connection = process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";

testBackend(() => new PostgresBackend({ connection, searchPath: "sidequest" }));
