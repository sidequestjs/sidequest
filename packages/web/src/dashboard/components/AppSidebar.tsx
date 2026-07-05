import { cn } from "../../ui/cn";
import { Icon } from "../../ui/Icon";
import { Kbd } from "../../ui/Kbd";
import type { DashboardPage } from "../app/shell";
import { EngineStatus } from "./EngineStatus";

/** Props for the {@link AppSidebar}. */
export interface AppSidebarProps {
  pages: DashboardPage[];
  /** Path of the currently active page (drives the highlight). */
  activePath: string;
  onNavigate: (path: string) => void;
  /** Opens the command palette (the search trigger). */
  onOpenPalette: () => void;
}

/** Groups pages by their optional `nav.section`, preserving first-seen order. */
function groupBySection(pages: DashboardPage[]): { section: string; items: DashboardPage[] }[] {
  const groups: { section: string; items: DashboardPage[] }[] = [];
  for (const page of pages) {
    const section = page.nav.section ?? "";
    const group = groups.find((g) => g.section === section);
    if (group) {
      group.items.push(page);
    } else {
      groups.push({ section, items: [page] });
    }
  }
  return groups;
}

/**
 * AppSidebar — the dashboard's left rail: brand lockup with an OSS tag, a ⌘K search
 * trigger, section-grouped navigation with per-item keyboard hints and a brand active
 * accent, and a live engine-status footer. Built from the page registry, so the Pro's
 * extra pages appear automatically.
 */
export function AppSidebar({ pages, activePath, onNavigate, onOpenPalette }: AppSidebarProps) {
  return (
    <aside className="relative z-[2] w-sidebar shrink-0 flex flex-col bg-surface-card border-r border-edge">
      <div className="flex items-center gap-2.5 px-[18px] py-4">
        <span aria-hidden className="font-brand text-xl font-semibold text-fg-strong">
          ◆
        </span>
        <span className="font-brand text-lg font-semibold text-fg-strong tracking-[-0.01em]">Sidequest</span>
        <span className="ml-auto font-mono text-[9.5px] tracking-[0.06em] text-brand bg-brand/15 border border-brand/30 px-[5px] py-0.5 rounded-[5px]">
          OSS
        </span>
      </div>

      <div className="px-3.5 pb-3">
        <button
          type="button"
          onClick={onOpenPalette}
          className="w-full flex items-center gap-2 h-[34px] px-2.5 rounded-lg bg-surface-inset border border-edge cursor-pointer text-fg-muted text-[13px] font-sans transition-colors hover:border-edge-strong"
        >
          <Icon name="search" size={14} />
          <span className="flex-1 text-left">Search…</span>
          <Kbd>Cmd</Kbd>
          <Kbd>K</Kbd>
        </button>
      </div>

      <nav className="flex-1 px-3.5 flex flex-col gap-4 overflow-y-auto">
        {groupBySection(pages).map((group) => (
          <div key={group.section} className="flex flex-col gap-0.5">
            {group.section && (
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-fg-muted px-2.5 pt-1 pb-1.5">
                {group.section}
              </div>
            )}
            {group.items.map((page) => {
              const on = page.path === activePath;
              return (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => onNavigate(page.path)}
                  className={cn(
                    "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-left text-[13.5px] font-sans transition-colors",
                    on
                      ? "bg-brand/15 text-fg-strong font-semibold"
                      : "bg-transparent text-fg-secondary font-medium hover:bg-surface-hover",
                  )}
                >
                  {on && (
                    <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-[3px] bg-brand" />
                  )}
                  <Icon name={page.nav.icon ?? "circle"} size={16} className={on ? "text-brand" : "text-fg-muted"} />
                  <span className="flex-1">{page.nav.label}</span>
                  {page.nav.hint && (
                    <span className="font-mono text-[10px] text-fg-muted opacity-0 transition-opacity group-hover:opacity-100">
                      {page.nav.hint}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-[18px] py-3.5 border-t border-edge-subtle">
        <EngineStatus />
      </div>
    </aside>
  );
}
