import type { ReactNode } from "react";
import { NavItem } from "../../ui/NavItem";
import { Sidebar } from "../../ui/Sidebar";
import { useHashRoute } from "./router";

/** A dashboard page: its route, its nav entry, and what to render. */
export interface DashboardPage {
  path: string;
  nav: { label: string; icon?: string };
  element: ReactNode;
}

/**
 * The dashboard shell: a sidebar built from `pages[].nav` and a content area that renders the
 * active page. This is the page-registry seam: the Pro passes a superset `pages` array (OSS
 * pages plus its own) to add screens without forking.
 */
export function DashboardShell({ pages }: { pages: DashboardPage[] }) {
  const { path, navigate } = useHashRoute();
  const active = pages.find((page) => page.path === path) ?? pages[0];

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--surface-page)" }}>
      <Sidebar brand="Sidequest">
        {pages.map((page) => (
          <NavItem
            key={page.path}
            label={page.nav.label}
            icon={page.nav.icon}
            active={page === active}
            href={`#${page.path}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(page.path);
            }}
          />
        ))}
      </Sidebar>
      <main style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>{active.element}</main>
    </div>
  );
}
