import Redis from "ioredis";
import zPopMinScored from './redis-commands/zpopmin_scored';

const client:any = new Redis();

client.defineCommand('zpopminbyscore', {
  numberOfKeys: 1,
  lua: zPopMinScored
});

export default client;