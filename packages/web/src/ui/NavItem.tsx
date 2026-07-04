import type { CSSProperties, MouseEvent } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/** Props for the {@link NavItem} sidebar link. */
export interface NavItemProps {
  label: string;
  /** Lucide icon name. */
  icon?: IconName;
  active?: boolean;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * NavItem — a single sidebar link. The active state gets a subtle raised fill and a
 * brand left-accent; hover lightens.
 */
export function NavItem({ label, icon, active = false, href = "#", onClick, className = "", style = {} }: NavItemProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "sq-navitem flex items-center gap-[0.65rem] px-3 py-2 rounded-sm text-sm no-underline border-l-2 transition-[background-color,color] duration-[120ms] ease-standard hover:bg-surface-hover hover:text-fg-strong",
        active
          ? "font-semibold text-fg-strong bg-surface-hover border-brand"
          : "font-medium text-fg bg-transparent border-transparent",
        className,
      )}
      style={style}
    >
      {icon && <Icon name={icon} size={16} className={active ? "text-brand" : "text-fg-secondary"} />}
      {label}
    </a>
  );
}
