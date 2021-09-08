import nanoId from 'nanoid';

import Queue from "./storage/scored_queue";

import loadTasks from './loader/load-tasks';

abstract class Task {
  abstract id:string;

  constructor(){
    if (!this.run) throw new Error('A Task must implement run method');
  }

  async execute(params: any){
    await this.run.call(this, ...params)
  }

  static async enqueue(options?: { performAt?: Date }, ...params: any){
    const tasksConfig = await loadTasks();
    const taskName = this.name;
    const config = tasksConfig[taskName];

    const queue = new Queue(config.queue);

    const score = options?.performAt?.getTime() || new Date().getTime();
    
    queue.push({ id: nanoId(36), task: taskName, args: params }, score)
  }

  abstract run(...params:any): void;
}

export default Task;