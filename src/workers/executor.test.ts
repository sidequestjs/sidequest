import { Sidequest } from 'src/sidequest';
import { execute, executeTask } from './executor';
import { assert } from 'chai';
import sinon from 'sinon';
import { JobData } from 'src/core/schema/job-data';
import path from 'path';
import { JobActions } from 'src/core/job/job-actions';

describe('executeTask', () => {
  it('should resolve when job.run() resolves', async () => {
    const job = {
      run: async () => 'ok'
    };

    const result = await executeTask(job as any);
    assert.equal(result, 'ok');
  });

  it('should reject if job.run() throws an error', async () => {
    const job = {
      run: async () => { throw new Error('fail'); }
    };

    try {
      await executeTask(job as any);
      assert.fail('Expected error, but promise resolved');
    } catch (err: any) {
      assert.instanceOf(err, Error);
      assert.equal(err.message, 'fail');
    }
  });

  it('should reject with a timeout error if job.run() hangs', async () => {
    const job = {
      run: async () => new Promise(() => {}), // never resolves
      timeout: 10,
      class: 'MyJob'
    };

    try {
      await executeTask(job as any);
      assert.fail('Expected timeout, but promise resolved');
    } catch (err: any) {
      assert.instanceOf(err, Error);
      assert.match(err.message, /timed out/);
    }
  });
});


describe('execute', () => {
  const sandbox = sinon.createSandbox();
  let claimedJobData: JobData = {} as JobData;

  let configureStub: sinon.SinonStub;
  let setRunningStub: sinon.SinonStub;
  let setCompleteStub: sinon.SinonStub;
  let setFailedStub: sinon.SinonStub;

  beforeEach(()=>{
    configureStub = sandbox.stub(Sidequest, 'configure');
    setRunningStub = sandbox.stub(JobActions, 'setRunning').callsFake(async (j) => j);
    setCompleteStub = sandbox.stub(JobActions, 'setComplete').callsFake(async (j) => j);
    setFailedStub = sandbox.stub(JobActions, 'setFailed');

    claimedJobData = {
      id: 1,
      queue: 'default',
      state: 'claimed',
      script: path.resolve('test-jobs/dummy-job.ts'),
      class: 'DummyJob',
      args: [],
      attempt: 0,
      max_attempts: 10,  
      inserted_at: new Date(),
      available_at: new Date(),
      claimed_at: new Date(),
      claimed_by: 'dummy-worker'
    }
  });

  afterEach(()=>{
    sandbox.restore();
  });

  it('executes a job', async () => {
    await execute(claimedJobData, {});
    assert.isTrue(configureStub.calledOnce, 'should call Sidequest.configure');
    assert.isTrue(setRunningStub.calledOnce, 'should call JobActions.setRunning');
    assert.isTrue(setCompleteStub.calledOnce, 'should call JobActions.setComplete');
    assert.isTrue(setFailedStub.notCalled, 'should not call JobActions.setComplete');
  });

  it('executes a failing job', async () => {
    claimedJobData.script = path.resolve('test-jobs/dummy-failed-job.ts');

    try {
      await execute(claimedJobData, {});
    } catch (error: any){
      assert.isTrue(configureStub.calledOnce, 'should call Sidequest.configure');
      assert.isTrue(setRunningStub.calledOnce, 'should call JobActions.setRunning');
      assert.isTrue(setCompleteStub.notCalled, 'should not call JobActions.setComplete');
      assert.isTrue(setFailedStub.calledOnce, 'should call JobActions.setComplete');
      assert.equal(error.message, 'failed job')
    }
  });

  it('fails with wrong class', async () => {
    claimedJobData.class = 'BadClass';

    try {
      await execute(claimedJobData, {});
    } catch (error: any){
      assert.isTrue(configureStub.calledOnce, 'should call Sidequest.configure');
      assert.isTrue(setRunningStub.notCalled, 'should not call JobActions.setRunning');
      assert.isTrue(setCompleteStub.notCalled, 'should not call JobActions.setComplete');
      assert.isTrue(setCompleteStub.notCalled, 'should not call JobActions.setComplete');
      assert.equal(error.message, 'Invalid job class: BadClass')
    }
  });
});