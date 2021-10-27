import nanoId from 'nanoid';

import Queue from "./storage/scored-queue";
import Metric from './monitor/metric';

import loadTasks from './loader/load-tasks';
import EnqueuedTask from './storage/enqueued-task';

interface TaskOptions {
  performAt?: Date,
  enqueuedAt: Date,
  params?: Array<any>,
  task: String
}

abstract class Task {
  id:string;
  enqueuedAt: Date;
  performAt: Date;

  timingMetric:Metric;
  latencyMetric:Metric;

  constructor(id?: string, enqueuedAt?: Date, performAt?:Date){
    if (!this.run) throw new Error('A Task must implement run method');
    this.id = id || nanoId(36);
    this.enqueuedAt = enqueuedAt || new Date();
    this.performAt = performAt || new Date();
    this.timingMetric = new Metric(`${this.constructor.name}.timing`);
    this.latencyMetric = new Metric(`${this.constructor.name}.latency`)
  }

  async execute(params: any){
    const startedAt = new Date().getTime();
    if (params)
      await this.run(...params)
    else
      await this.run()
    const currentTime = new Date().getTime();
    const timing = currentTime - startedAt;
    const latency = currentTime - this.performAt.getTime();
    this.timingMetric.sample(timing);
    this.latencyMetric.sample(latency);
  }

  static async enqueue(options: TaskOptions){
    const tasksConfig = await loadTasks();
    const taskName = this.name;

    const config = tasksConfig[taskName];

    if(!config){
      throw new Error(`Taks ${taskName} not defined at sidequest-config.json`);
    }

    const queue = new Queue(config.queue);

    const performAt = options?.performAt || new Date();

    const item:EnqueuedTask = {
      id: nanoId(36),
      performAt: performAt,
      enqueuedAt: new Date(),
      params: options.params,
      task: taskName,
    } 
    
    queue.push(item, performAt.getTime());
  }

  abstract run(...params:any): void;
}

export default Task;