exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_queues', function (table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('state').notNullable();
    table.integer('concurrency').notNullable();
    table.integer('priority').notNullable();
  });
  
  await knex.schema.createTable('sidequest_jobs', function (table) {
      table.increments('id').primary();
      table.string('queue').notNullable();
      table.string('class').notNullable();
      table.string('script').notNullable();
      table.text('args').notNullable();
      table.text('constructor_args').notNullable();
      table.text('result').nullable();
      table.text('errors').nullable();
      table.string('state').notNullable();
      table.timestamp('available_at').nullable();
      table.timestamp('inserted_at').notNullable();
      table.timestamp('attempted_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('failed_at').nullable();
      table.timestamp('canceled_at').nullable();
      table.timestamp('claimed_at').nullable();
      table.string('claimed_by').nullable();
      table.integer('attempt').notNullable();
      table.integer('max_attempts').notNullable();
      table.integer('timeout').nullable();
      table.string('unique_digest').nullable();
      table.text('uniqueness_config').nullable();
    });

    await knex.raw(`
      CREATE UNIQUE INDEX sidequest_jobs_unique_digest_active_idx
        ON sidequest_jobs (unique_digest)
        WHERE unique_digest IS NOT NULL;
    `);
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sidequest_jobs')
    .dropTableIfExists('sidequest_queues');
};
