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
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Docs", link: "/overview" },
    ],

    sidebar: [
      { text: "🔭 Overview", link: "/overview" },
      { text: "📦 Installation", link: "/installation" },
      { text: "🚀 Quick Start", link: "/quick-start" },
      { text: "💻 CLI", link: "/cli" },
      {
        text: "💼 Jobs",
        base: "/jobs",
        link: "/",
        collapsed: false,
        items: [
          {
            text: "Lifecycle",
            link: "/lifecycle",
          },
          {
            text: "Job Class",
            link: "/class",
          },
          {
            text: "Job.run Method",
            link: "/run-method",
          },
          {
            text: "Convenience Methods",
            link: "/convenience-methods",
          },
          {
            text: "Logging",
            link: "/logging",
          },
        ],
      },
      {
        text: "🛣️ Queues",
        base: "/queues",
        link: "/",
        collapsed: false,
        items: [
          {
            text: "States",
            link: "/states",
          },
          {
            text: "Priority",
            link: "/priority",
          },
          {
            text: "Concurrency",
            link: "/concurrency",
          },
        ],
      },
      {
        text: "⚙️ Engine",
        base: "/engine",
        link: "/",
        collapsed: false,
        items: [
          {
            text: "Configuration",
            link: "/configuration",
          },
          {
            text: "Starting the Engine",
            link: "/starting",
          },
          {
            text: "Enqueueing Jobs",
            link: "/enqueue",
          },
          {
            text: "Graceful Shutdown",
            link: "/graceful-shutdown",
          },
          {
            text: "Cleaning Up Jobs",
            link: "/cleanup",
          },
        ],
      },
      { text: "🌐 Dashboard", link: "/dashboard" },
      { text: "🧑‍💻 Development", link: "/development" },
      { text: "⚒️ Examples", link: "/examples" },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/sidequestjs/sidequest" }],

    logo: "logo.png",

    footer: {
      message: "Released under the LGPL-3.0 License.",
      copyright: "Copyright © 2025 Lucas Merencia and Giovani Guizzo",
    },
  },
});
