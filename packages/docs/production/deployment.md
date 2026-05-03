---
title: Deployment Guide
description: Deploying Sidequest in production — environment variables, process management, and multi-instance considerations.
---

# Deployment Guide

> **Work in progress.** This page is being written.

Key topics that will be covered here:

- Environment variable–driven configuration
- Running Sidequest as a dedicated worker process vs. alongside your web server
- PM2 / systemd / Docker examples
- Multi-instance deployments and cron deduplication with `unique()`
- Health checks and observability

In the meantime, see [Configuration](/getting-started/configuration) for all available options and [Backends](/production/backends) for database setup.
