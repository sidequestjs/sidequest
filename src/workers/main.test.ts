import { Sidequest, SidequestConfig } from '../sidequest';
import { Worker } from './main';
import { DummyJob } from '../test-jobs/dummy-job';

import { DynamicDummyJob } from '../test-jobs/dynamic-dummy-job';
import { assert } from 'chai';
import sinon from 'sinon';
import { JobActions } from '../core/job/job-actions';
import { JobData } from '../core/schema/job-data';
import { randomUUID } from 'node:crypto';

describe('main.ts', ()=> {
  let sandbox = sinon.createSandbox();
  let forkStub: sinon.SinonStub;

  const highQueueName = `high-${randomUUID()}`;
  const mediumQueueName = `medium-${randomUUID()}`;
  const lowQueueName = `low-${randomUUID()}`;
  const singleQueueName = `single-${randomUUID()}`;
  
  const queues = {}
  queues[highQueueName] = {queue: highQueueName, priority: 10}
  queues[mediumQueueName] = {queue: mediumQueueName, priority: 5}
  queues[lowQueueName] = {queue: lowQueueName }
  queues[singleQueueName] = {queue: singleQueueName,concurrency: 1}
  const config = { 
    queues: queues 
  } as SidequestConfig;

  const fakeChild = {
    on: sinon.stub(),
    send: sinon.stub(),
    kill: sinon.stub(),
  };

  before(async ()=>{
    await Sidequest.configure(config);
    await Sidequest.getBackend().setup();
  })

  after(()=> {
    Sidequest.getBackend().close();
  })

  beforeEach(() => {
    forkStub = sandbox.stub(require("child_process"), "fork");
  });
  
  afterEach(() => {
    sandbox.restore();
  });

  it('runs the worker',  async () => {
    const worker = new Worker();
    await worker.run(config);
    const jobData = await DummyJob.enqueue();

    forkStub.callsFake(()=>{
      JobActions.setComplete(jobData, "result");
      return fakeChild;
    })

    await new Promise(resolve => setTimeout(resolve, 1000));
    

    if(jobData.id){
      const job = await Sidequest.getBackend().getJob(jobData.id);
      assert.equal(job.state, 'completed');
    }

    worker.stop();
  });


  it('should process queues based on priority order', async () => {
    const worker = new Worker();
    
    await worker.run(config);
    
    await DynamicDummyJob.config({queue: lowQueueName }).enqueue();
    await DynamicDummyJob.config({queue: mediumQueueName }).enqueue();
    await DynamicDummyJob.config({queue: highQueueName }).enqueue();

    const executed: JobData[] = [];

    let onExit: Function;
    forkStub.callsFake(()=>{
      return fakeChild;
    });

    fakeChild.on.callsFake((event, onFn)=>{
      if(event === 'message'){
        onFn('ready');
      } else {
        onExit = onFn;
      }
    });

    fakeChild.send.callsFake((msg: any)=> {
      const job: JobData = msg.job;
      executed.push(job);
      onExit();
    })

    await new Promise(resolve => setTimeout(resolve, 1000));
    worker.stop();

    assert.equal(executed[0].queue, highQueueName);
    assert.equal(executed[1].queue, mediumQueueName);
    assert.equal(executed[2].queue, lowQueueName);
  });
})