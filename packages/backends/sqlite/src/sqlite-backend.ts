import { SQLBackend } from "@sidequest/backend";
import createKnex from "knex";
import path from "path";

/**
 * Represents a backend implementation for SQLite databases using Knex.
 *
 * This class extends the `SQLBackend` and configures a Knex instance
 * for SQLite3, specifying the database file path, migration directory,
 * migration table name, and file extension for migration files.
 *
 * @example
 * ```typescript
 * const backend = new SqliteBackend('./mydb.sqlite');
 * ```
 *
 * @extends SQLBackend
 */
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
