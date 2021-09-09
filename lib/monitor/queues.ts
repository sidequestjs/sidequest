import loadConfig from '../loader/load-config';
import ScoredQueue from '../storage/scored-queue';

class Queues {
    async info(){
      const config = await loadConfig();
      const pendingQueues = config.queues.map(async (q:any) => {
        const queue = Object.assign({}, q);

        const scoredQueue = new ScoredQueue(queue.name);
        queue.size = await scoredQueue.length();

        const items = await scoredQueue.get(0);
        if(items.length > 0){
          const firstItem = items[0];
          const delay = new Date().getTime() - firstItem.performAt.getTime();
          queue.delay = delay < 0 ? 0 : delay;
        } else {
          queue.delay = 0;
        }
      
        return queue;
      });

      return await Promise.all(pendingQueues)
    }
}

export default Queues;