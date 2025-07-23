import { safeParseJobData, SQLBackend } from "@sidequest/backend";
import { JobData } from "@sidequest/core";
import createKnex from "knex";
import { hostname } from "os";
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

  async claimPendingJob(queue: string, quantity = 1): Promise<JobData[]> {
    const workerName = `sidequest@${hostname()}-${process.pid}`;

    const result = (await this.knex.transaction(async (trx) =>
      trx("sidequest_jobs")
        .update({
          claimed_by: workerName,
          claimed_at: new Date(),
          state: "claimed",
        })
        .where("state", "waiting")
        .andWhere("queue", queue)
        .andWhere("available_at", "<=", new Date())
        .orderBy("inserted_at")
        .limit(quantity)
        .returning("*"),
    )) as JobData[];

    return result.map(safeParseJobData);
  }

  truncDate(date: string, unit: "m" | "h" | "d"): string {
    let format: string;
    switch (unit) {
      case "m":
        format = "%Y-%m-%dT%H:%M:00.000"; // Truncate to minute
        break;
      case "h":
        format = "%Y-%m-%dT%H:00:00.000"; // Truncate to hour
        break;
      case "d":
        format = "%Y-%m-%dT00:00:00.000"; // Truncate to day
        break;
    }
    return this.knex.raw(`strftime(?, datetime(${date} / 1000, 'unixepoch', 'localtime'))`, [format]).toQuery();
  }
}
