import Task from "../daemon/task-config";
import path from 'path';
import loadConfig from './load-config';

let tasks:any;

async function loadTasks() {
  if(tasks) return tasks;
  
  tasks = {};
  const config = await loadConfig();

  for(let i in config.tasks){
    const task:Task = config.tasks[i];
    const taskClass = await import(path.resolve(task.path));
    task.class = taskClass.default || taskClass;
    tasks[task.name] = task;
  }

  return tasks;
}

export default loadTasks;