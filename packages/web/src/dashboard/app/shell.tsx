import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { IconName } from "../ui/Icon";
import { AppSidebar } from "../components/AppSidebar";
import { CommandPalette } from "../components/CommandPalette";
import { DashboardHeader } from "../components/DashboardHeader";

/** An extra route a page owns that is not a nav entry (e.g. a detail view like `/jobs/$id`). */
export interface DashboardRoute {
  path: string;
  element: ReactNode;
}

/** A dashboard page: its route, its nav entry, what to render, and any owned detail routes. */
export interface DashboardPage {
  path: string;
  nav: {
    label: string;
    icon?: IconName;
    /** Sidebar section header this page groups under (e.g. "Monitor"). */
    section?: string;
    /** Keyboard hint shown on hover (e.g. "G J"). */
    hint?: string;
    /** Header subtitle for the page. */
    subtitle?: string;
  };
  element: ReactNode;
  /** Non-nav routes owned by this page, such as detail views. */
  routes?: DashboardRoute[];
}

const THEME_STORAGE_KEY = "sq-theme";

/** Flips `data-theme` between light and dark and persists it (mirrors {@link ThemeToggle}). */
function toggleTheme(): void {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* storage blocked */
  }
}

/**
 * Resolves the active page for a path by longest matching prefix, so detail routes like
 * `/jobs/42` still activate the `/jobs` page (for the header/nav). Falls back to the exact
 * match, then the root page.
 */
export function resolveActive(pages: DashboardPage[], path: string): DashboardPage {
  const prefix = pages
    .filter((page) => page.path !== "/" && (path === page.path || path.startsWith(`${page.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return prefix ?? pages.find((page) => page.path === path) ?? pages.find((page) => page.path === "/") ?? pages[0];
}

/** A route path relative to the root route ("/" stays the index; others drop the leading slash). */
function relativePath(path: string): string {
  return path === "/" ? "/" : path.replace(/^\//, "");
}

/**
 * The dashboard chrome (brand glow, section sidebar, sticky header, ⌘K command palette) wrapped
 * around the active page's `<Outlet />`. Lives inside the router so it can read the active path
 * and navigate.
 */
function DashboardChrome({ pages }: { pages: DashboardPage[] }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [palette, setPalette] = useState(false);
  const active = resolveActive(pages, pathname);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((open) => !open);
      }
      if (e.key === "Escape") {
        setPalette(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    void navigate({ to });
    setPalette(false);
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-surface">
      <div className="dash-glow" />
      <AppSidebar pages={pages} activePath={active.path} onNavigate={go} onOpenPalette={() => setPalette(true)} />
      <main className="relative z-[1] flex-1 overflow-y-auto">
        <DashboardHeader title={active.nav.label} subtitle={active.nav.subtitle} />
        <div className="px-7 pt-6 pb-12">
          <Outlet />
        </div>
      </main>
      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        pages={pages}
        onNavigate={go}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}

/**
 * Builds a TanStack Router from the page registry: a root route rendering the chrome, one child
 * route per page (plus any detail routes a page owns), on hash history so the dashboard serves
 * statically under any base path without server rewrites. This is the page-registry seam: the
 * Pro passes a superset `pages` array to add screens without forking.
 */
export function createDashboardRouter(pages: DashboardPage[]) {
  const rootRoute = createRootRoute({ component: () => <DashboardChrome pages={pages} /> });
  const children = pages.flatMap((page) => [
    createRoute({ getParentRoute: () => rootRoute, path: relativePath(page.path), component: () => <>{page.element}</> }),
    ...(page.routes ?? []).map((route) =>
      createRoute({ getParentRoute: () => rootRoute, path: relativePath(route.path), component: () => <>{route.element}</> }),
    ),
  ]);
  const routeTree = rootRoute.addChildren(children);
  return createRouter({ routeTree, history: createHashHistory() });
}

/**
 * The dashboard shell: builds the router from the page registry and renders it. Passing the same
 * `pages` keeps the router stable across re-renders.
 */
export function DashboardShell({ pages }: { pages: DashboardPage[] }) {
  const router = useMemo(() => createDashboardRouter(pages), [pages]);
  return <RouterProvider router={router} />;
}
