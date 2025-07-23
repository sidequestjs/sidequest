/* eslint-disable no-console */

import { createBackendFromDriver } from "@sidequest/backend";
import { program } from "commander";
import inquirer from "inquirer";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };

interface Config {
  backend: string;
  connection: {
    type: "direct" | "env";
    value?: string;
    varName?: string;
  };
}

function readConfig(): Config {
  const filePath = resolve(process.cwd(), ".sidequest.config.json");
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as Config;
  } catch {
    console.error(`\n❌ Could not read configuration file: ${filePath}`);
    console.error("Run `sidequest config` first to create one.");
    process.exit(1);
  }
}

function resolveConnection(config: Config): string {
  if (config.connection.type === "direct") {
    console.log(`Connection string: ${config.connection.value}`);
    return config.connection.value!;
  }

  const value = process.env[config.connection.varName!];
  if (value) {
    console.log(`Connection string (from env): ${value}`);
    return value;
  }

  console.error(`⚠️ Environment variable ${config.connection.varName} is not set`);
  process.exit(1);
}

program.name("sidequest").description("SideQuest CLI").version(pkg.version);

program
  .command("config")
  .description("Configure SideQuest")
  .action(async () => {
    const { backendChoice } = (await inquirer.prompt([
      {
        type: "list",
        name: "backendChoice",
        message: "Choose a backend:",
        choices: ["@sidequest/postgres-backend", "@sidequest/sqlite-backend"],
      },
    ])) as { backendChoice: string };

    const backend = backendChoice;

    const { connSource } = (await inquirer.prompt([
      {
        type: "list",
        name: "connSource",
        message: "How would you like to provide the connection string?",
        choices: ["Enter it manually", "Use an environment variable"],
      },
    ])) as { connSource: string };

    let connectionString: string | undefined;
    let envVar: string | undefined;

    if (connSource === "Enter it manually") {
      const example =
        backend === "@sidequest/postgres-backend"
          ? "postgres://user:password@localhost:5432/dbname"
          : "file:./mydb.sqlite";

      const { manualConn } = (await inquirer.prompt([
        {
          type: "input",
          name: "manualConn",
          message: `Enter the database connection string (e.g. ${example}):`,
        },
      ])) as { manualConn: string };

      connectionString = manualConn;
    } else {
      const { envVarName } = (await inquirer.prompt([
        {
          type: "input",
          name: "envVarName",
          message: "Enter the name of the environment variable:",
        },
      ])) as { envVarName: string };

      envVar = envVarName;
    }

    const config: Config = {
      backend,
      connection:
        connSource === "Enter it manually"
          ? { type: "direct", value: connectionString }
          : { type: "env", varName: envVar },
    };

    const filePath = resolve(process.cwd(), ".sidequest.config.json");
    writeFileSync(filePath, JSON.stringify(config, null, 2), "utf8");

    console.log(`\n✅ Configuration saved to: \x1b[36m${filePath}\x1b[0m`);
  });

program
  .command("migrate")
  .description("Run migrations using the configured backend")
  .action(async () => {
    const config = readConfig();

    console.log("\n🔷 Current Configuration:");
    console.log(`Backend: ${config.backend}`);

    const connection = resolveConnection(config);

    const backend = await createBackendFromDriver({
      driver: config.backend,
      config: connection,
    });

    await backend.migrate();
    await backend.close();
  });

program
  .command("rollback")
  .description("Rollback migrations using the configured backend")
  .action(async () => {
    const config = readConfig();

    console.log("\n🔷 Current Configuration:");
    console.log(`Backend: ${config.backend}`);

    const connection = resolveConnection(config);

    const backend = await createBackendFromDriver({
      driver: config.backend,
      config: connection,
    });

    await backend.rollbackMigration();
    await backend.close();
  });

program.parse();
