exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_jobs', (table) => {
    table.bigIncrements('id').unsigned().primary();

    table.string('queue', 191).notNullable().index();

    table.string('state', 50).notNullable();
    table.string('script', 191).notNullable();
    table.string('class', 191).notNullable();
    table.json('args').notNullable();
    table.json('constructor_args').notNullable();

    table.integer('timeout').unsigned().nullable();
    table.integer('attempt').unsigned().notNullable();
    table.integer('max_attempts').unsigned().notNullable();
    table.json('result').nullable();
    table.json('errors').nullable();

    table.timestamp('inserted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('attempted_at').nullable();
    table.timestamp('available_at').notNullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('failed_at').nullable();
    table.timestamp('cancelled_at').nullable();

    table.string('claimed_by', 191).nullable();
    table.timestamp('claimed_at').nullable();

    table.string('unique_digest', 191).nullable().unique();
    table.json('uniqueness_config').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sidequest_jobs');
};
