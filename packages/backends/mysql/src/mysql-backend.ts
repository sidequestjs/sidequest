import { SQLBackend } from "@sidequest/backend";
import createKnex, { Knex } from "knex";
import path from "path";

export default class MysqlBackend extends SQLBackend {
  constructor(dbConfig: string | Knex.ConnectionConfig) {
    const knex = createKnex({
      client: "mysql2",
      connection: dbConfig,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
    super(knex);
  }
}
