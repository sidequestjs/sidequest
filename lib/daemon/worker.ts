
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

  const loop = async () => {
      const result = await queue.pop(batchSize, new Date().getTime());

      if(result.length >  0){
        for(let i = 0; i < result.length; i++){
          try{
            await processTask(result[i]);
          } catch (error){
            console.error(error);
          }
        }
      }

    if(started) setTimeout(loop, 500);
  }

  const processTask = async(item: any) : Promise<any> => {
    const task = tasks[item.task];
    if(task && task.class){
      const instance:Task = new task.class();
      instance.id = item.id;
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