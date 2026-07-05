import type { ReactNode } from "react";
import { cn } from "./cn";

/** Props for the {@link Kbd} keyboard-key chip. */
export interface KbdProps {
  children: ReactNode;
  className?: string;
}

/**
 * Kbd — a small keyboard-key chip (e.g. ⌘ / K / Esc) for shortcut hints. Inset fill
 * with a thicker bottom border so it reads as a physical key.
 */
export function Kbd({ children, className = "" }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] px-1.5 py-[3px] font-sans text-[11px] leading-none rounded-[5px] bg-surface-inset text-fg-secondary border border-edge border-b-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
