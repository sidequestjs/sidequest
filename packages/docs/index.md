---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
description: Redis-free background jobs for Node.js. Persist jobs in your existing PostgreSQL, MySQL, SQLite, or MongoDB. A durable, distributed BullMQ alternative with a built-in dashboard.

hero:
  name: "Sidequest.js"
  text: "Redis-free background jobs for Node.js"
  tagline: "Persist jobs in the PostgreSQL, MySQL, SQLite, or MongoDB you already run. Durable, distributed, and a drop-in BullMQ alternative, with a dashboard included."
  image:
    src: /logo-modern.png
    alt: Blue hexagonal molecular network icon with three circular nodes, featuring a strong gradient with a bright, light-blue highlight, on a transparent background.
  actions:
    - theme: brand
      text: Installation
      link: /getting-started/installation
    - theme: alt
      text: Quick Start
      link: /getting-started/quick-start
    - theme: alt
      text: FAQ
      link: /resources/faq

features:
  - title: 🚫 No Redis Required
    details: Store jobs in PostgreSQL, MySQL, SQLite, or MongoDB. No extra stateful service to provision, secure, or pay for. Portable across any cloud or on-premises, no vendor lock-in.
  - title: 🚀 Production-Ready & Scalable
    details: Distributed by design. Jobs are claimed atomically (SELECT ... FOR UPDATE SKIP LOCKED), so each runs exactly once across nodes. Robust scheduling and retries, from startups to enterprise.
  - title: 📊 Beautiful Web Dashboard Included
    details: Monitor, reprocess, and debug jobs in real time with a modern dashboard – Ready to use out of the box, no hidden paywalls.
  - title: 🛠️ Open Source & Developer-First
    details: 100% free, instant npm install, TypeScript-native API, and clear docs. Built for rapid adoption by ambitious teams.
---
