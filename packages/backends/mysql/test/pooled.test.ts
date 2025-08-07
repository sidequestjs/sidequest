import { SQLDriverConfig } from "@sidequest/backend";
import { testBackend } from "@sidequest/backend-test";
import PostgresBackend from "../src/mysql-backend";

const connection = process.env.POSTGRES_URL ?? "mysql://root:mysql@localhost:3306/testdb";
const config: SQLDriverConfig = {
  connection,
  pool: {
    min: 5,
    max: 20,
  },
};

testBackend(() => new PostgresBackend(config));
