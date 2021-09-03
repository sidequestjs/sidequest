import redis from './redis-client';

class Queue {
  name: string;

  constructor(name: string){
    this.name = `queue-${name}`;
  }

  async push(item: object){
    const time = new Date();
    await redis.zadd(this.name, time.getTime(), JSON.stringify(item));
  }

  async pop(batchSize = 1){
    const result = await redis.zpopmin(this.name, batchSize);

    const data = [];

    if(result.length >  0){
      for(let i = 0; i < result.length; i= i+2){
        const item = result[i];
        data.push(JSON.parse(item));
      }
    }

    return data;
  }

}

export default Queue;