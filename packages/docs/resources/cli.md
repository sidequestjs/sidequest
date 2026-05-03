---
outline: deep
title: CLI Usage
description: CLI Usage guide for Sidequest.js
---

# CLI Usage

The Sidequest CLI provides an easy way to manage database migrations and configuration for your Sidequest job queue system. It supports all backend drivers and offers interactive setup wizards.

## Installation

Install the CLI globally to use it from anywhere:

::: code-group

```bash [npm]
npm install -g @sidequest/cli
```

```bash [yarn]
yarn global add @sidequest/cli
```

```bash [pnpm]
pnpm add -g @sidequest/cli
```

:::

The CLI can be invoked using either `sidequest` or the shorter `sq` alias:

```bash
sidequest --help
# or
sq --help
```

## Quick Start

Get started with three simple commands:

```bash
# 1. Configure your backend connection
sidequest config

# 2. Run database migrations
sidequest migrate

# 3. Start using Sidequest in your application
```

## Commands

### `sidequest config`

Interactive setup wizard to configure your backend connection. This command will prompt you to:

1. Choose a backend driver:
   - `@sidequest/postgres-backend`
   - `@sidequest/mysql-backend`
   - `@sidequest/sqlite-backend`
   - `@sidequest/mongo-backend`

2. Choose how to provide the connection string:
   - Enter it manually for immediate setup
   - Use an environment variable for secure deployment

**Example session:**

```bash
$ sidequest config
? Choose a backend: @sidequest/postgres-backend
? How would you like to provide the connection string? Use an environment variable
? Enter the name of the environment variable: DATABASE_URL

✅ Configuration saved to: /path/to/project/.sidequest.config.json
```

### `sidequest migrate`

Runs all pending database migrations to set up or update your Sidequest schema. This command:

- Creates the necessary tables for jobs and queues
- Sets up indexes for optimal performance
- Applies any schema updates for new Sidequest versions

```bash
$ sidequest migrate

🔷 Current Configuration:
Backend: @sidequest/postgres-backend
Connection string (from env): postgresql://postgres:password@localhost:5432/myapp

Running migrations...
✅ Migrations completed successfully
```

### `sidequest rollback`

Rolls back the most recent migration. Use this if you need to undo the last schema change:

```bash
$ sidequest rollback

🔷 Current Configuration:
Backend: @sidequest/postgres-backend
Connection string (from env): postgresql://postgres:password@localhost:5432/myapp

Rolling back last migration...
✅ Rollback completed successfully
```

## Configuration File

The `sidequest config` command creates a `.sidequest.config.json` file in your current directory:

### Environment Variable Configuration

```json
{
  "backend": "@sidequest/postgres-backend",
  "connection": {
    "type": "env",
    "varName": "DATABASE_URL"
  }
}
```

### Direct Connection Configuration

```json
{
  "backend": "@sidequest/sqlite-backend",
  "connection": {
    "type": "direct",
    "value": "./sidequest.sqlite"
  }
}
```

## Connection String Examples

### PostgreSQL

```bash
# Local PostgreSQL
postgresql://postgres:password@localhost:5432/sidequest

# Remote PostgreSQL with SSL
postgresql://user:password@db.example.com:5432/sidequest?sslmode=require

# PostgreSQL with custom port
postgresql://postgres:password@localhost:5433/sidequest
```

### MySQL

```bash
# Local MySQL
mysql://root:password@localhost:3306/sidequest

# Remote MySQL
mysql://user:password@mysql.example.com:3306/sidequest

# MySQL with SSL
mysql://user:password@localhost:3306/sidequest?ssl=true
```

### SQLite

```bash
# Relative path
./sidequest.sqlite

# Absolute path
/var/data/sidequest.sqlite

# In-memory (testing only)
:memory:
```

### MongoDB

```bash
# Local MongoDB
mongodb://localhost:27017/sidequest

# MongoDB with authentication
mongodb://user:password@localhost:27017/sidequest

# MongoDB Atlas
mongodb+srv://user:password@cluster.mongodb.net/sidequest
```

## Best Practices

### Development Workflow

1. **Initialize your project:**

   ```bash
   cd my-project
   sidequest config
   ```

2. **Set up your database:**

   ```bash
   sidequest migrate
   ```

3. **Version control:** Add `.sidequest.config.json` to your repository, but keep connection strings in environment variables for security.

### Production Deployment

1. **Use environment variables** for connection strings:

   ```bash
   export DATABASE_URL="postgresql://user:password@prod-db:5432/sidequest"
   ```

2. **Run migrations** as part of your deployment process:

   ```bash
   sidequest migrate
   ```

3. **Never commit** actual connection strings to version control.

## Troubleshooting

### Configuration File Not Found

```text
❌ Could not read configuration file: /path/to/.sidequest.config.json
Run `sidequest config` first to create one.
```

**Solution:** Run `sidequest config` to create the configuration file.

### Environment Variable Not Set

```text
⚠️ Environment variable DATABASE_URL is not set
```

**Solution:** Set the required environment variable:

```bash
export DATABASE_URL="your-connection-string"
```

### Backend Driver Not Found

```text
Backend driver "@sidequest/postgres-backend" not found or does not export a default class.
Make sure the driver package is installed (e.g., run "npm install @sidequest/postgres-backend").
```

**Solution:** Install the required backend driver:

```bash
npm install @sidequest/postgres-backend
```
