import { Job } from '../sidequest';

export class DummyJob extends Job {
  run(): any {
    throw new Error('failed job');
  }
}