import { Icon } from "../../ui/Icon";
import { ThemeToggle } from "../../ui/ThemeToggle";

/** Props for the {@link DashboardHeader}. */
export interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * DashboardHeader — the sticky, blurred page header: the active page's title and
 * subtitle on the left, the theme toggle and a docs link on the right.
 */
export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-[5] flex items-center justify-between px-7 py-4 bg-[color-mix(in_srgb,var(--surface-app)_82%,transparent)] backdrop-blur-[10px] border-b border-edge-subtle">
      <div>
        <h1 className="m-0 text-xl font-bold text-fg-strong tracking-[-0.01em]">{title}</h1>
        {subtitle && <div className="text-[12.5px] text-fg-muted mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <a
          href="https://docs.sidequestjs.com"
          target="_blank"
          rel="noreferrer"
          title="Docs"
          className="w-9 h-9 grid place-items-center rounded-lg bg-surface-raised border border-edge cursor-pointer text-fg-secondary no-underline transition-colors hover:bg-surface-hover hover:text-fg-strong"
        >
          <Icon name="book-open" size={16} />
        </a>
      </div>
    </header>
  );
}
