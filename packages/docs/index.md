---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Sidequest.js"
  text: "Background jobs without Redis"
  tagline: Store jobs in the database you already run. No extra service, no extra bill, no split transactions.
  image:
    src: /logo-modern.png
    alt: Blue hexagonal molecular network icon with three circular nodes, featuring a strong gradient with a bright, light-blue highlight, on a transparent background.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/installation
    - theme: alt
      text: Why Sidequest?
      link: /introduction/why
    - theme: alt
      text: Quick Start
      link: /getting-started/quick-start

features:
  - title: Skip Redis
    details: Persist jobs in Postgres, MySQL, SQLite, or MongoDB — the database you already pay for. One fewer service to deploy, monitor, secure, and back up.
  - title: Transactional enqueue
    details: INSERT a user and enqueue their welcome email in the same database transaction. No race conditions, no phantom jobs, no compensating logic.
  - title: Dashboard included
    details: Monitor jobs, inspect failures, requeue, cancel, and pause queues from a built-in web UI. No extra packages, no separate install, no paywall.
  - title: Two layers of isolation
    details: The engine runs in a forked child process; each job runs in a worker thread via piscina. Crashes in job code cannot take down your app.
---
