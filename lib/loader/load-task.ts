import path from 'path';
import Task from '../daemon/task';

const configPath = `${path.resolve('./')}/sidequest-config.json`;

let currentConfig: any;

export async function requireTask(taskName: string) {
  const config = currentConfig ||= await import(configPath);
  const foundTask = config.tasks.filter((task: Task) => task.name === taskName)?.[0];
  return import(path.resolve(foundTask.path));
}