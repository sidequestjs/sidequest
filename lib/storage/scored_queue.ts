import redis from './redis-client';

class Queue {
  name: string;

  constructor(name: string){
    this.name = `queue-${name}`;
  }

  async push(item: object, score: number ){
    await redis.zadd(this.name, score, JSON.stringify(item));
  }

  async pop(batchSize = 1, maxScore: number|string = "+inf"){
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

}

export default Queue;