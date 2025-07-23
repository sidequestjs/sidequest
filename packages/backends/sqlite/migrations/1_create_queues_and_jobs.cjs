exports.up = function(knex) {
  return knex.schema
    .createTable('sidequest_jobs', function (table) {
      table.increments('id').primary();
      table.string('queue').notNullable();
      table.string('class');
      table.string('script');
      table.text('args');
      table.text('result');
      table.text('errors');
      table.string('state').notNullable().defaultTo('pending');
      table.timestamp('available_at');
      table.timestamp('inserted_at');
      table.timestamp('attempted_at');
      table.timestamp('completed_at');
      table.timestamp('discarded_at');
      table.timestamp('cancelled_at');
      table.timestamp('claimed_at');
      table.string('claimed_by');
      table.integer('attempt');
      table.integer('max_attempts');
      table.integer('timeout').nullable();
    })
    .createTable('sidequest_queues', function (table) {
      table.increments('id').primary();
      table.string('queue').notNullable().index();
      table.string('state').notNullable().defaultTo('active');
      table.integer('concurrency').notNullable().defaultTo(10);
      table.integer('priority').notNullable().defaultTo(0);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sidequest_jobs')
    .dropTableIfExists('sidequest_queues');
};
