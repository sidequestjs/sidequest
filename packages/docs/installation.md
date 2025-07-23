---
outline: deep
title: Installation
description: Installation instructions for Sidequest.js
---

# Installation Instructions

To get started with Sidequest.js, you need to install the main package along with the backend driver of your choice. Below are the installation instructions for different package managers.

## Main Package (Required)

To get started with Sidequest, first install the main package:

::: code-group

```bash [npm]
npm install sidequest
```

```bash [yarn]
yarn add sidequest
```

```bash [pnpm]
pnpm add sidequest
```

:::

## Backend Drivers (Required)

To keep the application minimal, the main package does _not_ include the backend drivers. Thus you need to install only the driver you will use.

### PostgreSQL

We recommend using PostgreSQL for production applications. Install the PostgreSQL backend driver with:

::: code-group

```bash [npm]
npm install @sidequest/postgres-backend
```

```bash [yarn]
yarn add @sidequest/postgres-backend
```

```bash [pnpm]
pnpm add @sidequest/postgres-backend
```

:::

### SQLite

SQLite is the default backend and is suitable for development or small applications. However, it is not recommended for production use. To install the SQLite backend driver, run:
::: code-group

```bash [npm]
npm install @sidequest/sqlite-backend
```

```bash [yarn]
yarn add @sidequest/sqlite-backend
```

```bash [pnpm]
pnpm add @sidequest/sqlite-backend
```

:::

### MySQL

For MySQL, you can install the backend driver with:
::: code-group

```bash [npm]
npm install @sidequest/mysql-backend
```

```bash [yarn]
yarn add @sidequest/mysql-backend
```

```bash [pnpm]
pnpm add @sidequest/mysql-backend
```

:::

### Redis

For Redis, you can install the backend driver with:
::: code-group

```bash [npm]
npm install @sidequest/redis-backend
```

```bash [yarn]
yarn add @sidequest/redis-backend
```

```bash [pnpm]
pnpm add @sidequest/redis-backend
```

:::


## CLI Tool (Optional)

We also provide a CLI Tool to manage backend migrations and configurations. Sidequest will try to manage it in runtime, but if you prefer to do it via CLI for better control, you can install it globally:

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
