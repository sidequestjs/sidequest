import { type ButtonHTMLAttributes, useEffect, useState } from "react";
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

interface SizeSpec {
  box: string;
  icon: number;
}

const SIZES: Record<ThemeToggleSize, SizeSpec> = {
  sm: { box: "var(--control-height-sm)", icon: 15 },
  md: { box: "var(--control-height)", icon: 17 },
  lg: { box: "2.75rem", icon: 19 },
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
export function ThemeToggle({ size = "md", onChange, className = "", style = {}, ...rest }: ThemeToggleProps) {
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
      className={`sq-btn sq-btn--default ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s.box,
        height: s.box,
        padding: 0,
        color: "var(--text-primary)",
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition:
          "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    >
      <Icon name={isLight ? "moon" : "sun"} size={s.icon} />
    </button>
  );
}
