import type { CSSProperties, MouseEvent } from "react";
import { Icon } from "./Icon";

/** Props for the {@link NavItem} sidebar link. */
export interface NavItemProps {
  label: string;
  /** Lucide icon name. */
  icon?: string;
  active?: boolean;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * NavItem — a single sidebar link. The active state gets a subtle raised fill and a
 * brand left-accent; hover lightens (see `.sq-navitem` in the base layer).
 */
export function NavItem({ label, icon, active = false, href = "#", onClick, className = "", style = {} }: NavItemProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`sq-navitem ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
        padding: "0.5rem 0.75rem",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-sm)",
        fontWeight: active ? "var(--weight-semibold)" : "var(--weight-medium)",
        color: active ? "var(--text-strong)" : "var(--text-primary)",
        background: active ? "var(--surface-hover)" : "transparent",
        borderLeft: active ? "2px solid var(--brand-primary)" : "2px solid transparent",
        textDecoration: "none",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={16} style={{ color: active ? "var(--brand-primary)" : "var(--text-secondary)" }} />}
      {label}
    </a>
  );
}
