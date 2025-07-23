import { Job } from '../sidequest';

export class DynamicDummyJob extends Job {
  constructor(queue: string){
    super({
      queue: queue
    })
  }

  async run(): Promise<any> {
    await new Promise((r) => { setTimeout(r, 800)})
    return 'dummy job';
  }
}