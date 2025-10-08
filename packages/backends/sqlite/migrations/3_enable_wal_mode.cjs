/**
 * Migration to enable WAL (Write-Ahead Logging) mode for SQLite
 * 
 * WAL mode provides better concurrency for job processing:
 * - Allows simultaneous readers and one writer
 * - Reduces SQLITE_BUSY errors
 * - Better performance for write-heavy workloads
 * - More predictable behavior under concurrent load
 * 
 * Learn more: https://www.sqlite.org/wal.html
 */

exports.up = async function(knex) {
  await knex.schema.raw('PRAGMA journal_mode = WAL;');
  await knex.schema.raw('PRAGMA busy_timeout = 5000;');
  await knex.schema.raw('PRAGMA cache_size = -20000;');
  await knex.schema.raw('PRAGMA temp_store = memory;');
};

exports.down = function(knex) {
  // Revert to default rollback journal mode
  return knex.schema.raw('PRAGMA journal_mode = DELETE;')
    .then(() => knex.schema.raw('PRAGMA synchronous = FULL;'));
};
