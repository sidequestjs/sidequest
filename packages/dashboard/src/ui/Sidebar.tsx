import type { CSSProperties, ReactNode } from "react";

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
      className={`sq-sidebar ${className}`}
      style={{
        width: "var(--sidebar-width)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-card)",
        borderRight: "1px solid var(--border-default)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {logoSrc ? (
          <img src={logoSrc} alt="" style={{ height: 40, width: "auto" }} />
        ) : (
          <span
            aria-hidden
            style={{ fontFamily: "var(--font-brand)", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-strong)" }}
          >
            ◆
          </span>
        )}
        <span
          style={{
            fontFamily: "var(--font-brand)",
            fontSize: "var(--text-xl)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-strong)",
            letterSpacing: "-0.01em",
          }}
        >
          {brand}
        </span>
      </div>
      <nav style={{ flex: 1, padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {children}
      </nav>
      {footer && (
        <div
          style={{
            padding: "var(--space-4)",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}
