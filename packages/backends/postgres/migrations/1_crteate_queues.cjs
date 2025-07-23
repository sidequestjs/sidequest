exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_queues', (table) => {
    table.bigIncrements('id').primary();
    table.string('queue').notNullable().unique();

    table.string('state').notNullable().defaultTo('active');
    table.integer('concurrency').notNullable().defaultTo(10);
    table.integer('priority').notNullable().defaultTo(0);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('sidequest_queues');
};
