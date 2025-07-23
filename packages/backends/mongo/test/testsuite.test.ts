import { testBackend } from "@sidequest/backend-test";
import MongoBackend from "../src/mongo-backend";

const connection = process.env.MONGODB_URL ?? "mongodb://127.0.0.1:27017/test";

testBackend(() => new MongoBackend(connection));
