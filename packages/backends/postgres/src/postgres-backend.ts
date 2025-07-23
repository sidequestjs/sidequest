import { SQLBackend } from "@sidequest/backend";
import createKnex, { Knex } from "knex";
import path from "path";

/**
 * Provides a backend implementation for PostgreSQL databases using Knex.
 *
 * @extends SQLBackend
 *
 * @example
 * ```typescript
 * const backend = new PostgresBackend({ connection: 'postgres://user:pass@localhost/db' });
 * ```
 *
 * @param dbConfig - The database configuration object containing the connection string or Knex connection config.
 */
export default class PostgresBackend extends SQLBackend {
  constructor(dbConfig: string | Knex.ConnectionConfig) {
    const knex = createKnex({
      client: "pg",
      connection: dbConfig,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
    super(knex);
  }

  truncDate(date: string, unit: "m" | "h" | "d"): string {
    const precision = unit === "m" ? "minute" : unit === "h" ? "hour" : "day";
    return this.knex.raw(`date_trunc(?, ${date})`, [precision]).toQuery();
  }
}
