import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { Icon } from "./Icon";

/** Visual treatments for {@link Button}. */
export type ButtonVariant = "primary" | "default" | "outline" | "ghost" | "danger";
/** Sizes for {@link Button}. */
export type ButtonSize = "sm" | "md" | "lg";

/** Props for the {@link Button} action control. Extends the native `button` attributes. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual treatment. @default "default" */
  variant?: ButtonVariant;
  /** @default "md" */
  size?: ButtonSize;
  /** Leading Lucide icon name. */
  icon?: string;
  /** Trailing Lucide icon name. */
  iconRight?: string;
  /** Full-width. */
  block?: boolean;
  /** Pressed/selected look (e.g. active pagination). */
  active?: boolean;
}

interface SizeSpec {
  height: string;
  padding: string;
  font: string;
  gap: string;
  icon: number;
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: { height: "var(--control-height-sm)", padding: "0 0.7rem", font: "var(--text-xs)", gap: "0.35rem", icon: 14 },
  md: { height: "var(--control-height)", padding: "0 1rem", font: "var(--text-sm)", gap: "0.45rem", icon: 16 },
  lg: { height: "2.75rem", padding: "0 1.35rem", font: "var(--text-base)", gap: "0.5rem", icon: 18 },
};

/**
 * Button — the dashboard's primary action control. Subtle raised default, solid brand
 * primary, hairline outline, ghost (nav), and danger treatments, with an optional
 * leading/trailing Lucide icon.
 */
export function Button({
  children,
  variant = "default",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  block = false,
  active = false,
  type = "button",
  className = "",
  style = {},
  ...rest
}: ButtonProps) {
  const s = SIZES[size];

  const base: CSSProperties = {
    display: block ? "flex" : "inline-flex",
    width: block ? "100%" : "auto",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    fontFamily: "var(--font-sans)",
    fontSize: s.font,
    fontWeight: "var(--weight-medium)",
    lineHeight: 1,
    whiteSpace: "nowrap",
    borderRadius: "var(--radius-sm)",
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition:
      "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
    userSelect: "none",
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: { background: "var(--brand-primary)", color: "var(--on-brand)", borderColor: "var(--brand-primary)" },
    default: {
      background: active ? "var(--surface-hover)" : "var(--surface-raised)",
      color: "var(--text-primary)",
      borderColor: "var(--border-strong)",
    },
    outline: { background: "transparent", color: "var(--text-primary)", borderColor: "var(--border-strong)" },
    ghost: {
      background: active ? "var(--surface-hover)" : "transparent",
      color: "var(--text-primary)",
      borderColor: "transparent",
    },
    danger: { background: "transparent", color: "var(--status-failed)", borderColor: "var(--border-strong)" },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`sq-btn sq-btn--${variant} ${className}`}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.icon} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}
