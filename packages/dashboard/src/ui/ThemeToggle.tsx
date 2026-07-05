import { type ButtonHTMLAttributes, useEffect, useState } from "react";
import { cn } from "./cn";
import { Icon } from "./Icon";

/** The two themes the design system ships. */
export type Theme = "light" | "dark";
/** Sizes for {@link ThemeToggle}. */
export type ThemeToggleSize = "sm" | "md" | "lg";

/** Props for {@link ThemeToggle}. */
export interface ThemeToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** @default "md" */
  size?: ThemeToggleSize;
  /** Called with the newly-applied theme after each toggle. */
  onChange?: (theme: Theme) => void;
}

const STORAGE_KEY = "sq-theme";

const SIZES: Record<ThemeToggleSize, { box: string; icon: number }> = {
  sm: { box: "w-control-sm h-control-sm", icon: 15 },
  md: { box: "w-control h-control", icon: 17 },
  lg: { box: "w-11 h-11", icon: 19 },
};

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

// First-paint theme: an explicit data-theme on <html> wins, then a persisted choice,
// then the OS preference, else dark (the product default).
function readInitial(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (isTheme(attr)) {
    return attr;
  }
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  if (isTheme(saved)) {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked */
  }
}

/**
 * ThemeToggle — flips the document between the dark (default) and light themes by
 * setting `data-theme` on `<html>`, and persists the choice to localStorage. The
 * sun/moon glyph reflects the theme it will switch TO.
 */
export function ThemeToggle({ size = "md", onChange, className = "", ...rest }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(readInitial);
  const s = SIZES[size];

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isLight = theme === "light";

  const toggle = () => {
    const next: Theme = isLight ? "dark" : "light";
    setTheme(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={`Switch to ${isLight ? "dark" : "light"} theme`}
      title={`Switch to ${isLight ? "dark" : "light"} theme`}
      onClick={toggle}
      className={cn(
        "sq-btn sq-btn--default inline-flex items-center justify-center p-0 rounded-sm border border-edge-strong bg-surface-raised text-fg cursor-pointer transition-[background-color,border-color,color] duration-[120ms] ease-standard enabled:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-ring",
        s.box,
        className,
      )}
      {...rest}
    >
      <Icon name={isLight ? "moon" : "sun"} size={s.icon} />
    </button>
  );
}
