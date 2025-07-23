import { Knex, knex as createKnex } from "knex";
import { Backend } from "../backend";
import path from "path";
import { Job } from "../../core/job";

import os from 'os';

export class PostgresBackend implements Backend{
  knex: Knex<any, unknown[]>;

  constructor(dbConfig: { connection: string | Knex.ConnectionConfig }){
    this.knex = createKnex({
      client: 'pg',
      connection: dbConfig.connection,
      migrations: {
        directory: path.join(__dirname, '..', '..', '..', 'migrations', 'postgres'),
        tableName: 'sidequest_migrations',
        extension: 'js'
      },
    });
  }

  async getQueuesNames(): Promise<string[]> {
    const queues = await this.knex('sidequest_jobs').select('queue').distinct();
    return queues.map(q => q.queue);
  }

  async insertJob(job: Job, args: any[] = []): Promise<void> {
    args = Array.isArray(args) ? args : []
    const data = {
      queue: job.queue,
      class: job.class,
      script: job.script,
      args: this.knex.raw('?', [JSON.stringify(args)])
    }

    await this.knex('sidequest_jobs').insert(data).returning('*');
  }

  async claimPendingJob(queue: string, quatity: number = 1): Promise<Job[]> {
    const workerName = `sidequest@${os.hostname()}-${process.pid}`;

    const result = await this.knex.transaction(async (trx) => {
      return await trx('sidequest_jobs')
        .update({
          claimed_by: workerName,
          claimed_at: this.knex.fn.now(),
          state: 'claimed',
        })
        .whereIn('id', function() {
          this.select('id')
            .from('sidequest_jobs')
            .where('state', 'pending')
            .where('queue', queue)
            .andWhere('available_at', '<=', trx.fn.now() )
            .orderBy('inserted_at')
            .forUpdate()
            .skipLocked()
            .limit(quatity);
        })
        .returning('*');
    });

    return result;
  }

  async updateJob(job: Job): Promise<Job> {
    const data: any = {
      id: job.id,
      queue: job.queue,
      state: job.state,
      script: job.script,
      class: job.class,
      attempt: job.attempt,
      max_attempts: job.max_attempts,
      errors: job.errors,
      inserted_at: job.inserted_at,
      attempted_at: job.attempted_at,
      available_at: job.available_at,
      completed_at: job.completed_at,
      discarded_at: job.discarded_at,
      cancelled_at: job.cancelled_at,
      claimed_at: job.claimed_at,
      claimed_by: job.claimed_by
    }

    if(job.args) data.args = this.knex.raw('?', [JSON.stringify(job.args)]);
    if(job.result) data.result = this.knex.raw('?', JSON.stringify(job.result));
    if(job.errors && job.errors.length > 0) data.errors = job.errors;

    const updated = await this.knex('sidequest_jobs').update(data).where({ id: job.id }).returning('*');

    if(updated.length > 0) return updated[0];

    throw Error('Cannot update job, not found.')
  }

  async setup(): Promise<void> {
    try {
      const [batchNo, log] = await this.knex.migrate.latest();
      if(log.length > 0){
        console.log(`Migrated batch ${batchNo}:`);
        log.forEach((file:any) => console.log(`  - ${file}`));
      }
    } catch (err) {
      console.error('Migration failed:', err);
    }
  }

  async close(): Promise<void>{
    await this.knex.destroy();
  }
}