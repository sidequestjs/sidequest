import { testBackend } from "@sidequest/backend-test";
import MysqlBackend from "../src/mysql-backend";

const connection = process.env.MYSQL_URL ?? "mysql://root:mysql@localhost:3306/testdb";

testBackend(() => new MysqlBackend(connection));
