
import loadTasks from '../loader/load-tasks';
import Task from '../task';
import Queue from '../storage/queue';

const BATCH_SIZE = process.env.SIDEQUEST_BATCH_SIZE || '10';

let loop: any;

async function start(queueName: string) {
  if(loop) throw new Error('Worker already started!');

  const process = async() : Promise<any> => {
    const tasks = await loadTasks();
    let batchSize = parseInt(BATCH_SIZE);
    if(isNaN(batchSize)) batchSize = 10;

    const queue = new Queue(queueName);
    
    const result = await queue.pop(batchSize);

    if(result.length >  0){
      for(let i = 0; i < result.length; i++){
        const job = result[i];
        const task = tasks[job.task];
        if(task && task.class){
          const instance:Task = new task.class();
          instance.id = job.id;
          await instance.execute(job.args);
        } else {
          throw new Error(`cannot process item: ${job}`);
        } 
      }
      return process();
    }
  }

  setInterval(process, 500);
}

process.on('message', async(message:any) => {
  try {
    if(message.command === 'start') await start(message.queue);
  } catch(error){
    console.log(error)
  }
});