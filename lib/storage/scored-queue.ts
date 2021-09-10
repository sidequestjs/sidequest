import redis from './redis-client';
import EnqueuedTask from './enqueued-task';

class Queue {
  name: string;

  constructor(name: string){
    const _name = name.replace(/\s/g, '-')
    this.name = `sidequest-queue-${_name}`;
  }

  async push(item: EnqueuedTask, score: number ){
    await redis.zadd(this.name, score, JSON.stringify(item));
  }

  async pop(batchSize = 1, maxScore: number|string = "+inf"): Promise<Array<EnqueuedTask>>{
    const result = await redis.zpopminbyscore(this.name, maxScore, batchSize);

    const data = [];

    if(result.length >  0){
      for(let i = 0; i < result.length; i++){
        const item = result[i];
        data.push(JSON.parse(item));
      }
    }

    return data;
  }

  async length(){
    return redis.zcard(this.name)
  }

  async get(start: number, end?: number){
    if(!end){
      end = start;
    }
    const result = await redis.zrange(this.name, start, end, 'WITHSCORES');

    if(result.length < 2) return [];
    
    const elements = [];

    for(let i = 0; i < result.length; i = i + 2){
      const element = JSON.parse(result[i]);
      element.performAt = new Date(parseInt(result[i+1])); 
      elements.push(element);
    }
    
    return elements;
  }

}

export default Queue;