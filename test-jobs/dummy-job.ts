import { Job } from '../src/sidequest';

export class DummyJob extends Job {
  run(): any {
    return 'dummy job';
  }
}