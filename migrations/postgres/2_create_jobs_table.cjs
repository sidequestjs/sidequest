exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_jobs', (table) => {
    table.bigIncrements('id').primary();
    table.string('queue').notNullable().index();

    table.string('state').notNullable().defaultTo('pending');
    table.string('script').notNullable();
    table.string('class').notNullable();
    table.jsonb('args').notNullable();

    table.integer('timeout').nullable();
    table.integer('attempt').notNullable().defaultTo(0);
    table.integer('max_attempts').notNullable().defaultTo(5);
    table.specificType('result', 'jsonb').notNullable().defaultTo('{}');
    table.specificType('errors', 'jsonb[]').notNullable().defaultTo('{}');

    table.timestamp('inserted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('attempted_at').nullable();
    table.timestamp('available_at').notNullable().defaultTo(knex.fn.now()); // for retry/delay
    table.timestamp('completed_at').nullable();
    table.timestamp('discarded_at').nullable();
    table.timestamp('cancelled_at').nullable();

    table.string('claimed_by').nullable();
    table.timestamp('claimed_at').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('sidequest_jobs');
};
