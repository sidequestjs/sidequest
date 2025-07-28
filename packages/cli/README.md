# @sidequest/cli

Command-line interface for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

## Summary

This package provides a CLI tool for managing Sidequest database migrations and configuration. It offers an interactive setup wizard to configure your backend connection and simple commands to manage your database schema.

The CLI supports all Sidequest backends (PostgreSQL, MySQL, SQLite, MongoDB) and provides an easy way to initialize and maintain your job queue database without writing code.

## Installation

Install the CLI globally:

```bash
npm install -g @sidequest/cli
# or
yarn global add @sidequest/cli
```

## Basic Usage

### Quick Start

```bash
# Configure your backend connection
sidequest config

# Run database migrations
sidequest migrate

# Rollback last migration (if needed)
sidequest rollback
```

### Available Commands

- **`sidequest config`** - Interactive setup wizard for backend configuration
- **`sidequest migrate`** - Run pending database migrations
- **`sidequest rollback`** - Rollback the most recent migration

## Documentation

For complete CLI documentation, usage examples, and configuration options, visit:

**[https://docs.sidequestjs.com/cli](https://docs.sidequestjs.com/cli)**

## License

LGPL-3.0-or-later
