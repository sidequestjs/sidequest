import redis from '../storage/redis-client';

export default class Metric {
  name: string;
  
  constructor(name: string){
    this.name = `sidequest-metric-${name}`;
  }

  sample(value: number){
    redis.lpush(this.name, value);
    redis.ltrim(this.name, 0, 99);
  }
}

