---
outline: deep
title: Overview
description: Overview of Sidequest.js, a robust distributed job processing library for Node.js.
---

![Sidequest.js Logo](/logo-full.png "Sidequest.js Logo")

**Sidequest** is an open-source, modern, scalable distributed background job processor for Node.js applications. Built with TypeScript and designed for production use, it provides reliable job processing with multiple database backends, a beautiful web dashboard, and comprehensive monitoring capabilities.

## ✨ Features

- 🚀 **High Performance** - Worker threads for non-blocking job processing
- 🗄️ **Multiple Backends** - SQLite, PostgreSQL, MySQL, and MongoDB support out of the box
- ✅ **ESM and CJS support** - Fully compatible with modern JavaScript
- 📝 **Support for TypeScript** - Supports running TypeScript jobs by default if you are using [Node.js >= 24](https://nodejs.org/api/typescript.html#modules-typescript)
- 🔠 **Fully Typed** - TypeScript support for all APIs and configuration options
- 📊 **Web Dashboard** - Beautiful, responsive dashboard for monitoring jobs and queues
- 🎯 **Queue Management** - Multiple queues with configurable workers and priorities
- 🫀 **Job Lifecycle Management** - Configurable retry with exponential backoff, snooze, and fail mechanisms
- ⏰ **Scheduled Jobs** - Support for scheduling jobs to run at specific times
- 🔒 **Job Uniqueness** - Prevent duplicate jobs with flexible uniqueness constraints
- 🛠️ **CLI Tools** - Command-line interface for database migrations and management
- 🏗️ **Monorepo Architecture** - Modular packages for flexible deployment
- 📦 **Easy Installation** - Simple setup with npm or yarn
