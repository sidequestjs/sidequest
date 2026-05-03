# CLAUDE.md

Guidance for Claude Code when working in this repository.

> **Canonical docs:** [docs.sidequestjs.com](https://docs.sidequestjs.com) (source under `packages/docs/`). When end-user behavior is in doubt, read the docs first — they cover the public API in detail. This file documents what the docs **don't** make obvious to someone modifying the codebase.

## What Sidequest is

Production-grade distributed background job processor for Node.js. Persists jobs in a SQL or document database (no Redis), exposes a fluent API + management dashboard, and isolates execution in worker threads. LGPL-3.0, published as `sidequest` + separate `@sidequest/*-backend` driver packages.

## Repository layout

Monorepo on **Yarn 4 (Berry, via Corepack) + Turbo**. Workspaces declared in root `package.json`: `packages/*`, `packages/backends/*`, `examples`.

| Package | Public name | Role |
|---|---|---|
| `packages/sidequest` | `sidequest` | Umbrella package end users install. Exposes `Sidequest`, re-exports the rest. Source is intentionally thin — mostly the `Sidequest` static class and operations facade. |
| `packages/engine` | `@sidequest/engine` | Orchestration. Owns the `Engine`, `Dispatcher`, `QueueManager`, `ExecutorManager`, `JobBuilder`, `JobTransitioner`, cron registry, routines (cleanup, stale recovery), shared runner pool. |
| `packages/core` | `@sidequest/core` | Shared primitives: `Job` base class, schema/types (`JobData`, `QueueConfig`, etc.), state transitions, logger (Winston), uniqueness, tools. |
| `packages/dashboard` | `@sidequest/dashboard` | Express + EJS + HTMX + Tailwind/DaisyUI web UI. Can run standalone via `SidequestDashboard`. |
| `packages/cli` | `@sidequest/cli` | `sidequest` / `sq` CLI for `config`, `migrate`, `rollback`. |
| `packages/docs` | (private) | VitePress site → docs.sidequestjs.com. |
| `packages/backends/backend` | `@sidequest/backend` | Backend interface + `SQLBackend` base (Knex-based). |
| `packages/backends/backend-test` | `@sidequest/backend-test` | Conformance suite every backend driver runs. |
| `packages/backends/{postgres,mysql,sqlite,mongo}` | `@sidequest/{name}-backend` | Driver implementations. SQL backends extend `SQLBackend` (Knex); Mongo is its own thing. |
| `examples/` | (private) | Runnable usage examples. **Useful but incomplete** — never treat as the source of truth. |

`tests/integration/` at the root holds cross-package integration tests.

## Dev loop

```bash
# Setup (once)
corepack enable && yarn install

# Build everything (Turbo orchestrates per-package Rollup)
yarn build

# Watch mode for everything, including docs site at http://localhost:5173
yarn dev

# Unit tests (excludes backend conformance + tests/integration)
yarn test

# Backend conformance + integration: needs the DBs running
yarn db:all                # spins up pg, mysql, mongo via docker
yarn test:all              # all tests including backends
yarn test:integration      # cross-package integration suite
yarn db:all:stop

# Lint / format
yarn lint
yarn format

# Single-file vitest run (run from repo root)
yarn vitest packages/engine/src/job/job-builder.test.ts

# Clean
yarn clean   # rimraf packages/**/dist + .turbo
```

Vitest is the test runner across the repo (Mocha/Chai/Sinon are gone). Rollup builds each package; **don't reach for `tsc` to build** — Turbo + Rollup own that. Per-package `vitest.config.js` extends `vitest.base.config.js` at the root.

Node ≥ 22.6.0 required. TypeScript jobs run natively on Node ≥ 23.6.0.

## Architecture essentials (the parts that matter when editing)

```
┌─────────────────┐    fork() + IPC    ┌──────────────────────────────────┐
│ App process     │ ─────────────────► │ Engine worker process            │
│ • Sidequest API │                    │  ├─ Dispatcher (polls backend)   │
│ • enqueue/build │                    │  ├─ QueueManager / ExecutorMgr   │
│ • Dashboard     │                    │  └─ piscina pool (worker threads)│
└─────────────────┘                    │       └─ runs Job#run in thread  │
                                       └──────────────────────────────────┘
                                               │
                                               ▼
                                       ┌──────────────────┐
                                       │ Backend (DB)     │
                                       └──────────────────┘
```

- **Two layers of isolation, deliberately:**
  1. The engine itself runs in a child process forked from the app (`child_process.fork`). Crashes in job code can't kill the host app.
  2. Inside the engine process, jobs execute in **worker threads via [`piscina`](https://github.com/piscinajs/piscina)** — that's the runner pool in `packages/engine/src/shared-runner/`. `minThreads`/`maxThreads`/`idleWorkerTimeout` configure piscina.
- **Dispatcher** polls the backend at `jobPollingInterval` (default 100 ms), claims jobs atomically, and hands them to the executor. Increasing this interval reduces DB load but adds start latency.
- **Backends are Knex-based** for SQL (Postgres/MySQL/SQLite); the `Backend` interface and `SQLBackend` base live in `packages/backends/backend`. Drivers are dynamically `import()`ed by their npm name (the `driver` config string).
- **Atomicity matters.** `claimPendingJob` must claim under contention without double-issuing. The conformance suite in `@sidequest/backend-test` enforces this — run it whenever you touch a backend.

## Public API surface (mental model)

- `Sidequest.configure(config)` — set up engine, run migrations, **don't start workers**. Use this when an instance only enqueues. `configure` is idempotent and a subsequent `start()` will **ignore** any new config.
- `Sidequest.start(config?)` — `configure` + spin up the engine fork + dashboard. Calling `start()` after `configure()` reuses the configured options.
- `Sidequest.stop()` — graceful: drain running jobs, close backend, stop dashboard. Safe to start again afterward.
- `Sidequest.build(JobClass)` → `JobBuilder` (fluent: `.queue() .timeout() .maxAttempts() .retryDelay() .backoffStrategy() .availableAt() .unique() .with(...ctorArgs) .enqueue(...runArgs) | .schedule(cron, ...runArgs)`).
- `Sidequest.job` — `.get`, `.list`, `.count`, `.cancel`, `.run`, `.snooze`, `.findStale`, `.deleteFinished`.
- `Sidequest.queue` — `.get`, `.list`, `.create`, `.pause`, `.activate`, `.toggle`, `.setConcurrency`, `.setPriority`.
- `Job` class (`@sidequest/core`) with `async run(...args)`. Runtime metadata (`this.id`, `this.attempt`, etc.) is injected **after construction**, only available inside `run`. Convenience methods inside `run`: `return this.complete(result)` / `this.fail(reason)` / `this.retry(reason, delay?)` / `this.snooze(delay)`. **You must `return` them** — calling without returning is a no-op.
- `SidequestDashboard` (`@sidequest/dashboard`) — standalone dashboard against a shared backend.

## Behavioral nuances that bite

These are the things that aren't visually loud in either code or docs:

- **Queue config in `start({ queues })` overrides DB state.** If an operator changed concurrency/priority via the dashboard, restarting with that queue listed will reset it. Only queues explicitly named are touched.
- **Cron schedules are in-memory only.** `JobBuilder.schedule(...)` registers via `node-cron`; it is **not persisted**. Multi-instance deployments will all schedule the same job — use `unique({ period: 'minute' | 'hour' | ... })` to deduplicate, or run scheduling on a single node.
- **Auto-resolution uses stack traces** to find the job's source file. This breaks under bundling (Next/Nuxt/serverless). The escape hatch is `manualJobResolution: true` + a `sidequest.jobs.js` re-export file. The engine walks parent dirs from `cwd` to find it unless `jobsFilePath` is set; relative `jobsFilePath` is resolved against the file that called `configure/start`, **not** `cwd`.
- **SQLite + concurrency > 1 = `SQLITE_BUSY`.** Single-writer file locking. Either keep `maxConcurrentJobs: 1` or use a real DB. Always use a separate `.sqlite` file from the host app.
- **Stale job recovery is automatic.** Jobs stuck in `running`/`claimed` past the configured age get reset by the routine in `packages/engine/src/routines/release-stale-jobs.ts`. Don't reinvent it.
- **Backend driver loading is `import(driver)`.** The driver string is the npm package name; the package must `export default` the backend class. Same goes for custom drivers — relative paths work but are sensitive to `cwd`.
- **Dashboard without `auth` is wide open.** Any job-mutation operation (cancel, re-run) is exposed. Treat `auth: undefined` as dev-only.

## Coding principles in this repo

- **Default answer to a new dependency is no.** Don't add a library because it's popular — Sidequest deliberately keeps its dep graph small. Prefer stdlib or what's already in the tree. If a new dep is genuinely the right call, name the alternatives considered before adding.
- **Don't wrap things "just in case."** No backwards-compat shims, no feature flags for hypothetical use cases, no validation at internal boundaries.
- **Match existing structure.** New engine concerns go under `packages/engine/src/<area>`; cross-cutting types belong in `@sidequest/core`. Don't create a new package for a small piece.
- **Tests live next to the code.** `foo.ts` + `foo.test.ts` in the same folder; integration tests under `tests/integration/`. Backend changes must keep `@sidequest/backend-test` green for every driver.
- **Commits follow Conventional Commits** (commitlint + Husky enforce it). semantic-release publishes from `master`.

## Scope guard

- `dist/` at the repo root is legacy — not produced by the current build, safe to delete/ignore. Build artifacts live in `packages/*/dist/` and `packages/backends/*/dist/`.
- The pre-1.0 `lib/`-based POC (Redis + child_process.fork + `Task` class + `sidequest-config.json`) is gone. If something still references it, it's stale.
