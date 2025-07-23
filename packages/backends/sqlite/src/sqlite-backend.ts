import { SQLBackend } from "@sidequest/backend";
import createKnex from "knex";
import path from "path";

export default class SqliteBackend extends SQLBackend {
  constructor(filePath = "./sidequest.sqlite") {
    const knex = createKnex({
      client: "sqlite3",
      connection: {
        filename: filePath,
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
    super(knex);
  }
}
