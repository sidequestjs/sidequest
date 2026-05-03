import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Sidequest.js",
  description: "Robust distributed job processing for Node.js",
  lang: "en-US",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", href: "/logo-modern.png" }],
    ["script", { async: "", src: `https://www.googletagmanager.com/gtag/js?id=${process.env.VITE_GA_TAG}` }],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${process.env.VITE_GA_TAG}');`,
    ],
  ],
  rewrites: {
    // Old top-level pages → new locations
    "overview.md": "introduction/why.md",
    "installation.md": "getting-started/installation.md",
    "quick-start.md": "getting-started/quick-start.md",
    "cli.md": "resources/cli.md",
    "dashboard.md": "resources/dashboard.md",
    "development.md": "resources/development.md",
    "examples.md": "resources/examples.md",
    "faq.md": "resources/faq.md",
    // Old jobs/* → guide/jobs/*
    "jobs/:page": "guide/jobs/:page",
    // Old queues/* → guide/queues/*
    "queues/:page": "guide/queues/:page",
    // Old engine/* → new locations
    "engine/configuration.md": "getting-started/configuration.md",
    "engine/backends.md": "production/backends.md",
    "engine/enqueue.md": "guide/jobs/enqueueing.md",
    "engine/graceful-shutdown.md": "production/graceful-shutdown.md",
    "engine/cleanup.md": "production/cleanup.md",
    "engine/starting.md": "production/starting.md",
    "engine/index.md": "api/sidequest.md",
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Docs", link: "/introduction/why" },
      { text: "API", link: "/api/sidequest" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Why Sidequest", link: "/introduction/why" },
          { text: "How It Works", link: "/introduction/how-it-works" },
          { text: "Alternatives", link: "/introduction/comparison" },
        ],
      },
      {
        text: "Getting Started",
        items: [
          { text: "Installation", link: "/getting-started/installation" },
          { text: "Quick Start", link: "/getting-started/quick-start" },
          { text: "Configuration", link: "/getting-started/configuration" },
        ],
      },
      {
        text: "Jobs",
        base: "/guide/jobs",
        link: "/",
        collapsed: false,
        items: [
          { text: "Job Class", link: "/class" },
          { text: "Lifecycle", link: "/lifecycle" },
          { text: "run() Method", link: "/run-method" },
          { text: "Convenience Methods", link: "/convenience-methods" },
          { text: "Enqueueing", link: "/enqueueing" },
          { text: "Recurring Jobs", link: "/recurring" },
          { text: "Logging", link: "/logging" },
        ],
      },
      {
        text: "Queues",
        base: "/guide/queues",
        link: "/",
        collapsed: false,
        items: [
          { text: "Concurrency", link: "/concurrency" },
          { text: "Priority", link: "/priority" },
          { text: "States", link: "/states" },
        ],
      },
      {
        text: "Production",
        base: "/production",
        collapsed: false,
        items: [
          { text: "Backends", link: "/backends" },
          { text: "Graceful Shutdown", link: "/graceful-shutdown" },
          { text: "Cleanup", link: "/cleanup" },
          { text: "Manual Job Resolution", link: "/manual-resolution" },
          { text: "Deployment", link: "/deployment" },
        ],
      },
      {
        text: "Recipes",
        base: "/recipes",
        link: "/",
        collapsed: true,
        items: [
          { text: "Sending Emails", link: "/emails" },
          { text: "Rate Limiting", link: "/rate-limiting" },
          { text: "Job Chaining", link: "/chaining" },
          { text: "Scheduled Reports", link: "/scheduled-reports" },
          { text: "Standalone Dashboard", link: "/standalone-dashboard" },
        ],
      },
      {
        text: "API Reference",
        base: "/api",
        collapsed: true,
        items: [
          { text: "Sidequest", link: "/sidequest" },
          { text: "Job", link: "/job" },
          { text: "Queue", link: "/queue" },
        ],
      },
      {
        text: "Resources",
        items: [
          { text: "CLI", link: "/resources/cli" },
          { text: "Dashboard", link: "/resources/dashboard" },
          { text: "FAQ", link: "/resources/faq" },
          { text: "Examples", link: "/resources/examples" },
          { text: "Contributing", link: "/resources/development" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/sidequestjs/sidequest" }],

    logo: "logo.png",

    footer: {
      message: "Released under the LGPL-3.0 License.",
      copyright: "Copyright © 2025 Lucas Merencia and Giovani Guizzo",
    },

    search: {
      provider: "local",
    },
  },
});
