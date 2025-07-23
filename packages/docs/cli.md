---
outline: deep
title: CLI Usage
description: CLI Usage guide for Sidequest.js
---

# CLI Usage

Sidequest includes a CLI for database migrations and management:

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

```bash
# Configure connection
sidequest config

# Run migrations
sidequest migrate

# Rollback migrations
sidequest rollback
```

## CLI Configuration

`sidequest config` will create a `.sidequest.config.json` file, e.g.:

```json
{
  "backend": "@sidequest/postgres-backend",
  "connection": {
    "type": "env",
    "varName": "DATABASE_URL"
  }
}
```
