
import loadTasks from '../loader/load-tasks';
import Task from '../task';
import Queue from '../storage/scored-queue';

const BATCH_SIZE = process.env.SIDEQUEST_BATCH_SIZE || '10';

let started: boolean;

async function start(queueName: string) {
  if(started) throw new Error('Worker already started!');
  started = true;

  const tasks = await loadTasks();
  let batchSize = parseInt(BATCH_SIZE);
  if(isNaN(batchSize)) batchSize = 10;

  const queue = new Queue(queueName);
  const failedQueue = new Queue(`failed-${queueName}`)

  const loop = async () => {
      const result = await queue.pop(batchSize, new Date().getTime());

      if(result.length >  0){
        for(let i = 0; i < result.length; i++){
          try{
            await processTask(result[i]);
          } catch (error){
            console.error(error);
            failedQueue.push(result[i], new Date().getTime());
          }
        }
      }

    if(started) setTimeout(loop, 500);
  }

  const processTask = async(item: any) : Promise<any> => {
    const task = tasks[item.task];
    if(task && task.class){
      const enqueuedAt = item.enqueuedAt ? new Date(item.enqueuedAt) : null;
      const performAt = item.performAt ? new Date(item.performAt) : null;
      const instance:Task = new task.class(item.id, enqueuedAt, performAt);
      await instance.execute(item.params);
    } else {
      throw new Error(`cannot process item: ${JSON.stringify(item)}`);
    } 
  }

  loop();
}

process.on('message', async(message:any) => {
  try {
    if(message.command === 'start') await start(message.queue);
  } catch(error){
    console.log(error)
  }
});