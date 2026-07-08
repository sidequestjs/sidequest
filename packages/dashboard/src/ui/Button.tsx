import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

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
  icon?: IconName;
  /** Trailing Lucide icon name. */
  iconRight?: IconName;
  /** Full-width. */
  block?: boolean;
  /** Pressed/selected look (e.g. active pagination). */
  active?: boolean;
}

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap select-none font-sans font-medium leading-none rounded-sm border border-transparent cursor-pointer transition-[background-color,border-color,transform] duration-[120ms] ease-standard disabled:opacity-50 disabled:cursor-not-allowed enabled:active:translate-y-[0.5px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-ring";

const SIZES: Record<ButtonSize, { class: string; icon: number }> = {
  sm: { class: "h-control-sm px-[0.7rem] gap-[0.35rem] text-xs", icon: 14 },
  md: { class: "h-control px-4 gap-[0.45rem] text-sm", icon: 16 },
  lg: { class: "h-11 px-[1.35rem] gap-2 text-base", icon: 18 },
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand border-brand enabled:hover:bg-brand-hover enabled:hover:border-brand-hover",
  default: "text-fg border-edge-strong enabled:hover:bg-surface-hover",
  outline: "bg-transparent text-fg border-edge-strong enabled:hover:bg-surface-hover",
  ghost: "text-fg border-transparent enabled:hover:bg-surface-hover",
  danger:
    "bg-transparent text-status-failed border-edge-strong enabled:hover:bg-status-failed/10 enabled:hover:border-status-failed",
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
  ...rest
}: ButtonProps) {
  const s = SIZES[size];
  // `active` fills default/ghost with the hover surface to read as pressed/selected.
  const activeFill = active && (variant === "default" || variant === "ghost") ? "bg-surface-hover" : "";
  const defaultRaised = variant === "default" && !active ? "bg-surface-raised" : "";

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        `sq-btn sq-btn--${variant}`,
        BASE,
        s.class,
        VARIANTS[variant],
        defaultRaised,
        activeFill,
        block ? "flex w-full" : "inline-flex w-auto",
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.icon} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}
