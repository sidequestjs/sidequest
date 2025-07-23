exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_jobs', (table) => {
    table.bigIncrements('id').primary();

    table.string('queue', 191).notNullable().index();

    table.string('state', 50).notNullable();
    table.string('script', 191).notNullable();
    table.string('class', 191).notNullable();
    table.json('args').notNullable();
    table.json('constructor_args').notNullable();

    table.integer('timeout').nullable();
    table.integer('attempt').notNullable();
    table.integer('max_attempts').notNullable();
    table.json('result').nullable();
    table.json('errors').nullable();

    table.dateTime('inserted_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.dateTime('attempted_at', { precision: 3 }).nullable();
    table.dateTime('available_at', { precision: 3 }).notNullable();
    table.dateTime('completed_at', { precision: 3 }).nullable();
    table.dateTime('failed_at', { precision: 3 }).nullable();
    table.dateTime('canceled_at', { precision: 3 }).nullable();

    table.string('claimed_by', 191).nullable();
    table.dateTime('claimed_at', { precision: 3 }).nullable();

    table.string('unique_digest', 191).nullable().unique();
    table.json('uniqueness_config').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sidequest_jobs');
};
