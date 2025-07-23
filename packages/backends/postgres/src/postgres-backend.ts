import { SQLBackend } from "@sidequest/backend";
import createKnex, { Knex } from "knex";
import path from "path";

export default class PostgresBackend extends SQLBackend {
  constructor(dbConfig: { connection: string | Knex.ConnectionConfig }) {
    const knex = createKnex({
      client: "pg",
      connection: dbConfig.connection,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
    super(knex);
  }
}
