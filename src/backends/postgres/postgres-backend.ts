import { Knex, knex as createKnex } from "knex";
import { Backend } from "../backend";
import path from "path";
import { Job } from "src/sidequest";

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

  async insertJob(job: Job, args: any[] = []): Promise<void> {
    args = Array.isArray(args) ? args : []
    const data = {
      queue: job.queue,
      class: job.className,
      script: job.script,
      args: this.knex.raw('?', [JSON.stringify(['arg1', 'arg2'])])
    }
    await this.knex('sidequest_jobs').insert(data);
  }

  async claimPendingJob(queue: string): Promise<any> {
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
            .limit(1);
        })
        .returning('*');
    });

    return result;
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