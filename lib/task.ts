import nanoId from 'nanoid';

import Queue from "./storage/scored-queue";
import Metric from './monitor/metric';

import loadTasks from './loader/load-tasks';

abstract class Task {
  abstract id:string;
  metric:Metric;

  constructor(){
    if (!this.run) throw new Error('A Task must implement run method');
    this.metric = new Metric(this.constructor.name);
  }

  async execute(params: any){
    const startedAt = new Date().getTime();
    await this.run.call(this, ...params)
    const timing = new Date().getTime() - startedAt;
    this.metric.sample(timing);
  }

  static async enqueue(options?: { performAt?: Date }, ...params: any){
    const tasksConfig = await loadTasks();
    const taskName = this.name;
    const config = tasksConfig[taskName];

    if(!config) throw new Error(`Taks ${taskName} not defined at sidequest-config.json`);

    const queue = new Queue(config.queue);

    const score = options?.performAt?.getTime() || new Date().getTime();
    
    queue.push({ id: nanoId(36), task: taskName, args: params }, score);
  }

  abstract run(...params:any): void;
}

export default Task;