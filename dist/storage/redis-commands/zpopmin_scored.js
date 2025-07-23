"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var script = "\n  local items = redis.call('ZRANGEBYSCORE', KEYS[1], 0, ARGV[1], 'LIMIT', 0, ARGV[2]);\n  if table.getn(items) > 0 then\n    redis.call('ZREM', KEYS[1], unpack(items));\n  end\n  return items;\n";
exports.default = script;
