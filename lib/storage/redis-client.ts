import Redis from "ioredis";
import zPopMinScored from './redis-commands/zpopmin_scored';

const redisURL = process.env.REDIS_URL || process.env.SIDEQUEST_REDIS_URL || 'redis://localhost:6479'
const client:any = new Redis(redisURL);

client.defineCommand('zpopminbyscore', {
  numberOfKeys: 1,
  lua: zPopMinScored
});

export default client;