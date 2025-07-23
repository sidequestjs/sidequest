import { testBackend } from "@sidequest/backend-test";
import RedisBackend from "../src/redis-backend";

const connection = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

testBackend(() => new RedisBackend(connection));
