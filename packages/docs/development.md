---
outline: deep
title: Development
description: Development guide for Sidequest.js
---

# Development

## Prerequisites

- Node.js 22.6.0+
- Yarn 4.x (with Corepack)

## Architecture

Sidequest is built as a monorepo with the following packages:

- **`sidequest`** - Main package combining all components
- **`@sidequest/docs`** - Documentation site using Vitepress
- **`@sidequest/core`** - Core functionality, logging, and schema definitions
- **`@sidequest/engine`** - Job processing engine with worker thread management
- **`@sidequest/backend`** - Abstract backend interface
- **`@sidequest/backend-test`** - Test suite for backend implementations
- **`@sidequest/sqlite-backend`** - SQLite backend implementation
- **`@sidequest/postgres-backend`** - PostgreSQL backend implementation
- **`@sidequest/mysql-backend`** - MySQL backend implementation
- **`@sidequest/mongo-backend`** - MongoDB backend implementation
- **`@sidequest/dashboard`** - Web dashboard with Express.js, EJS, and HTMX
- **`@sidequest/cli`** - Command-line interface tools

## Build

If you want to build Sidequest from source, follow these steps:

```bash
# Clone the repository
git clone https://github.com/sidequestjs/sidequest.git
cd sidequest

# Enable Corepack
corepack enable

# Install dependencies
yarn install

# Build all packages
yarn build
```

## Development Mode

If you want to develop Sidequest, you can run the development server for the entire application, including the documentation site:

```bash
yarn dev
```

This will enable the dev server, which will watch for changes in the source code and automatically rebuild the affected packages. The documentation site will also be available at `http://localhost:5173`.

## Testing

To run the tests, first either build the application or run it in development mode. Then, you can execute the tests for all packages in a separate terminal:

```bash
# Starts all the test DBs in Docker containers
yarn db:all

# Run tests for all packages
yarn test:all
```

If you'd rather not run backend tests, you can run the minified test suite without starting any DB containers:

```bash
# Run tests without backend implementations
yarn test
```
