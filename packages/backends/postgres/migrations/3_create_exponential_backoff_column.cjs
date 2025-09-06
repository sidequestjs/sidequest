exports.up = async function(knex) {
  await knex.schema.table('sidequest_jobs', function(table) {
    table.integer('retry_delay').nullable();
    table.text('backoff_strategy').notNullable().defaultTo('exponential');
  });
};

exports.down = function(knex) {
  return knex.schema.table('sidequest_jobs', function(table) {
    table.dropColumn('retry_delay');
    table.dropColumn('backoff_strategy');
  });
};
