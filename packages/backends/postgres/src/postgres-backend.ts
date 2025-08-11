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
  private schemaName?: string;

  constructor(dbConfig: string | SQLDriverConfig) {
    const knexConfig: Knex.Config = {
      ...defaultKnexConfig,
      ...(typeof dbConfig === "string" ? { connection: dbConfig } : dbConfig),
    };

    let schemaName: string | undefined;
    if (knexConfig.searchPath) {
      schemaName = typeof knexConfig.searchPath === "string" ? knexConfig.searchPath : knexConfig.searchPath[0];
      knexConfig.migrations!.schemaName = schemaName;
    }

    const knex = createKnex(knexConfig);
    super(knex);

    this.schemaName = schemaName;
  }

  /**
   * Migrates the database by ensuring the required schema exists and then invoking the parent migration logic.
   *
   * @remarks
   * If a schema name is specified, this method will attempt to create the schema if it does not already exist.
   * After ensuring the schema, it delegates further migration steps to the parent class.
   *
   * @returns A promise that resolves when the migration process is complete.
   */
  async migrate(): Promise<void> {
    // Create schema if it doesn't exist
    if (this.schemaName) {
      await this.knex.raw(`CREATE SCHEMA IF NOT EXISTS ??`, [this.schemaName]);
    }

    // Call parent migrate method
    await super.migrate();
  }

  truncDate(date: string, unit: "m" | "h" | "d"): string {
    const precision = unit === "m" ? "minute" : unit === "h" ? "hour" : "day";
    return this.knex.raw(`date_trunc(?, ${date})`, [precision]).toQuery();
  }
}
