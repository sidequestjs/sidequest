import type { Knex } from "knex";
import { describe, expect, it, vi } from "vitest";
import { SQLBackend } from "./sql-backend";

class TestSQLBackend extends SQLBackend {
  truncDate(): string {
    return "";
  }
}

describe("SQLBackend migrations", () => {
  it("propagates migration failures", async () => {
    const migrationError = new Error("migration failed");
    const knex = {
      migrate: {
        latest: vi.fn().mockRejectedValue(migrationError),
      },
    } as unknown as Knex;
    const backend = new TestSQLBackend(knex);

    await expect(backend.migrate()).rejects.toBe(migrationError);
  });

  it("propagates rollback failures", async () => {
    const rollbackError = new Error("rollback failed");
    const knex = {
      migrate: {
        rollback: vi.fn().mockRejectedValue(rollbackError),
      },
    } as unknown as Knex;
    const backend = new TestSQLBackend(knex);

    await expect(backend.rollbackMigration()).rejects.toBe(rollbackError);
  });
});
