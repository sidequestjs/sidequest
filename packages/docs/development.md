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
- **`@sidequest/core`** - Core functionality, logging, and schema definitions
- **`@sidequest/engine`** - Job processing engine with worker thread management
- **`@sidequest/backend`** - Abstract backend interface
- **`@sidequest/sqlite-backend`** - SQLite backend implementation
- **`@sidequest/postgres-backend`** - PostgreSQL backend implementation
- **`@sidequest/mysql-backend`** - MySQL backend implementation
- **`@sidequest/dashboard`** - Web dashboard with Express.js, EJS, and HTMX
- **`@sidequest/cli`** - Command-line interface tools
- **`@sidequest/backend-test`** - Test suite for backend implementations

## Setup

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

# Run tests
yarn test

# Start development mode
yarn dev
```
