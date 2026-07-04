# @sidequest/web

Web layer for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

> **Rewrite in progress.** The dashboard is being rebuilt on React + Vite. This package
> currently ships only the UI component library. The OSS dashboard app, the management
> API, and the façade that boots them are landing in follow-up work.

## Subpath exports

- `@sidequest/web/ui` — the design-system component library (React).
- `@sidequest/web/ui/styles.css` — design tokens as plain CSS.

Planned: `@sidequest/web/dashboard` (OSS React app), `@sidequest/web/api` (Hono management
API), and `@sidequest/web` (default façade that composes and serves everything).

## Usage

```tsx
import { Button, Table } from "@sidequest/web/ui";
import "@sidequest/web/ui/styles.css";
```

## License

LGPL-3.0-or-later
