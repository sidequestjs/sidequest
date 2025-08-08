import { SQLDriverConfig } from "@sidequest/backend";
import { testBackend } from "@sidequest/backend-test";
import PostgresBackend from "../src/postgres-backend";

const connection = process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";
const config: SQLDriverConfig = {
  connection,
  pool: {
    min: 5,
    max: 20,
  },
};

testBackend(() => new PostgresBackend(config));
