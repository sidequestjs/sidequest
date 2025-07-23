exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_queues', function (table) {
    table.increments('id').primary();
    table.string('queue').notNullable().index();
    table.string('state').notNullable().defaultTo('active');
    table.integer('concurrency').notNullable().defaultTo(10);
    table.integer('priority').notNullable().defaultTo(0);
  });
  
  await knex.schema.createTable('sidequest_jobs', function (table) {
      table.increments('id').primary();
      table.string('queue').notNullable();
      table.string('class');
      table.string('script');
      table.text('args');
      table.text('constructor_args');
      table.text('result');
      table.text('errors');
      table.string('state').notNullable().defaultTo('waiting');
      table.timestamp('available_at');
      table.timestamp('inserted_at');
      table.timestamp('attempted_at');
      table.timestamp('completed_at');
      table.timestamp('failed_at');
      table.timestamp('cancelled_at');
      table.timestamp('claimed_at');
      table.string('claimed_by');
      table.integer('attempt');
      table.integer('max_attempts');
      table.integer('timeout').nullable();
      table.string('unique_digest').nullable();
    });

    await knex.raw(`
      CREATE UNIQUE INDEX sidequest_jobs_unique_digest_active_idx
        ON sidequest_jobs (unique_digest)
        WHERE unique_digest IS NOT NULL
          AND state IN ('waiting', 'claimed', 'running');
    `);
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sidequest_jobs')
    .dropTableIfExists('sidequest_queues');
};
