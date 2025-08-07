import { SQLBackend, SQLDriverConfig } from "@sidequest/backend";
import createKnex, { Knex } from "knex";
import path from "path";

const defaultKnexConfig = {
  client: "pg",
  migrations: {
    directory: path.join(import.meta.dirname, "..", "migrations"),
    tableName: "sidequest_migrations",
    extension: "cjs",
  },
};

/**
 * Provides a backend implementation for PostgreSQL databases using Knex.
 *
 * @extends SQLBackend
 *
 * @example
 * Basic usage with connection string:
 * ```typescript
 * const backend = new PostgresBackend('postgres://user:pass@localhost/db');
 * ```
 *
 * @example
 * Advanced usage with connection pooling:
 * ```typescript
 * const backend = new PostgresBackend({
 *   connection: 'postgres://user:pass@localhost/db',
 *   pool: {
 *     min: 2,
 *     max: 10,
 *     acquireTimeoutMillis: 60000,
 *     idleTimeoutMillis: 600000
 *   }
 * });
 * ```
 *
 * @param dbConfig - Database configuration - can be a connection string or limited Knex config
 */
export default class PostgresBackend extends SQLBackend {
  constructor(dbConfig: string | SQLDriverConfig) {
    const knexConfig: Knex.Config = {
      ...defaultKnexConfig,
      ...(typeof dbConfig === "string" ? { connection: dbConfig } : dbConfig),
    };

    const knex = createKnex(knexConfig);
    super(knex);
  }

  truncDate(date: string, unit: "m" | "h" | "d"): string {
    const precision = unit === "m" ? "minute" : unit === "h" ? "hour" : "day";
    return this.knex.raw(`date_trunc(?, ${date})`, [precision]).toQuery();
  }
}
