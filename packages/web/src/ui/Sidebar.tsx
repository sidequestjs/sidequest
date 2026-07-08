import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

/** Props for the {@link Sidebar} app rail. */
export interface SidebarProps {
  /** Brand mark image src. Falls back to a glyph if omitted. */
  logoSrc?: string;
  /** Brand name. @default "Sidequest" */
  brand?: string;
  /** Footer text. @default "v0.1.0 · OSS Edition" */
  footer?: ReactNode;
  /** NavItem children. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Sidebar — the dashboard's fixed left rail: brand lockup on top, nav in the middle,
 * version footer at the bottom. Children are {@link NavItem}s.
 */
export function Sidebar({
  logoSrc,
  brand = "Sidequest",
  footer = "v0.1.0 · OSS Edition",
  children,
  className = "",
  style = {},
}: SidebarProps) {
  return (
    <aside
      className={cn("sq-sidebar w-sidebar shrink-0 flex flex-col bg-surface-card border-r border-edge", className)}
      style={style}
    >
      <div className="flex items-center gap-[0.6rem] p-4 border-b border-edge-subtle">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-10 w-auto" />
        ) : (
          <span aria-hidden className="font-brand text-xl font-semibold text-fg-strong">
            ◆
          </span>
        )}
        <span className="font-brand text-xl font-semibold text-fg-strong tracking-[-0.01em]">{brand}</span>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1">{children}</nav>
      {footer && <div className="p-4 border-t border-edge-subtle text-xs text-fg-muted">{footer}</div>}
    </aside>
  );
}
