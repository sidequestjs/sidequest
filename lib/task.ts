import nanoId from 'nanoid';

import Queue from "./storage/queue";

import loadTasks from './loader/load-tasks';

abstract class Task {
  abstract id:string;

  constructor(){
    if (!this.run) throw new Error('A Task must implement run method');
  }

  async execute(params: any){
    await this.run.call(this, ...params)
  }

  static async enqueue(...params: any){
    const tasksConfig = await loadTasks();
    const taskName = this.name;
    const config = tasksConfig[taskName];

    const queue = new Queue(config.queue);

    queue.push({ id: nanoId(36), task: taskName, args: params })
  }

  abstract run(...params:any): void;
}

export default Task;