exports.up = async function(knex) {
  await knex.schema.createTable('sidequest_queues', (table) => {
    table.bigIncrements('id').primary();
    table.string('name').notNullable().unique();

    table.string('state').notNullable();
    table.integer('concurrency').notNullable();
    table.integer('priority').notNullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('sidequest_queues');
};
