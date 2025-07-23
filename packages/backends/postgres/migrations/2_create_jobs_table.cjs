exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_jobs', (table) => {
    table.bigIncrements('id').primary();
    table.string('queue').notNullable().index();

    table.string('state').notNullable();
    table.string('script').notNullable();
    table.string('class').notNullable();
    table.jsonb('args').notNullable();
    table.jsonb('constructor_args').notNullable();

    table.integer('timeout').nullable();
    table.integer('attempt').notNullable();
    table.integer('max_attempts').notNullable();
    table.jsonb('result').nullable();
    table.jsonb('errors').nullable();

    table.timestamp('inserted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('attempted_at').nullable();
    table.timestamp('available_at').notNullable(); // for retry/delay
    table.timestamp('completed_at').nullable();
    table.timestamp('failed_at').nullable();
    table.timestamp('canceled_at').nullable();

    table.string('claimed_by').nullable();
    table.timestamp('claimed_at').nullable();

    table.string('unique_digest').nullable();
    table.jsonb('uniqueness_config').nullable();
  });

  await knex.raw(`
    CREATE UNIQUE INDEX sidequest_jobs_unique_digest_active_idx
      ON sidequest_jobs (unique_digest)
      WHERE unique_digest IS NOT NULL;
  `);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sidequest_jobs');
};
