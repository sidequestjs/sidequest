const script = `
  local items = redis.call('ZRANGEBYSCORE', KEYS[1], 0, ARGV[1], 'LIMIT', 0, ARGV[2]);
  if table.getn(items) > 0 then
    redis.call('ZREM', KEYS[1], unpack(items));
  end
  return items;
`

export default script;


