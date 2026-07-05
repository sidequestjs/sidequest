import { useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "../components/AppSidebar";
import { CommandPalette } from "../components/CommandPalette";
import { DashboardHeader } from "../components/DashboardHeader";
import { useHashRoute } from "./router";

/** A dashboard page: its route, its nav entry, and what to render. */
export interface DashboardPage {
  path: string;
  nav: {
    label: string;
    icon?: string;
    /** Sidebar section header this page groups under (e.g. "Monitor"). */
    section?: string;
    /** Keyboard hint shown on hover (e.g. "G J"). */
    hint?: string;
    /** Header subtitle for the page. */
    subtitle?: string;
  };
  element: ReactNode;
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
 * `/jobs/42` still activate the `/jobs` page. Falls back to the exact match, then the
 * root page.
 */
function resolveActive(pages: DashboardPage[], path: string): DashboardPage {
  const prefix = pages
    .filter((page) => page.path !== "/" && (path === page.path || path.startsWith(`${page.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return prefix ?? pages.find((page) => page.path === path) ?? pages.find((page) => page.path === "/") ?? pages[0];
}

/**
 * The dashboard shell: the modern chrome (brand glow, section sidebar, sticky header,
 * ⌘K command palette) wrapped around the active page. This is the page-registry seam:
 * the Pro passes a superset `pages` array (OSS pages plus its own) to add screens
 * without forking.
 */
export function DashboardShell({ pages }: { pages: DashboardPage[] }) {
  const { path, navigate } = useHashRoute();
  const [palette, setPalette] = useState(false);
  const active = resolveActive(pages, path);

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
    navigate(to);
    setPalette(false);
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-surface">
      <div className="dash-glow" />
      <AppSidebar pages={pages} activePath={active.path} onNavigate={go} onOpenPalette={() => setPalette(true)} />
      <main className="relative z-[1] flex-1 overflow-y-auto">
        <DashboardHeader title={active.nav.label} subtitle={active.nav.subtitle} />
        <div className="px-7 pt-6 pb-12">{active.element}</div>
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
