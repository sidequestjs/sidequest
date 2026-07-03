import type { CSSProperties, ReactNode } from "react";

/** Props for the {@link Pagination} control. */
export interface PaginationProps {
  page: number;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Pagination — the dashboard's joined prev / page / next control. Buttons abut with
 * shared borders; the ends disable when there is no previous/next page.
 */
export function Pagination({ page, hasNext = false, onPrev, onNext, className = "", style = {} }: PaginationProps) {
  const btn = (content: ReactNode, enabled: boolean, onClick: (() => void) | undefined, active: boolean) => (
    <button
      type="button"
      disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      style={{
        height: "var(--control-height-sm)",
        minWidth: "2rem",
        padding: "0 0.7rem",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-medium)",
        fontFamily: "var(--font-sans)",
        color: active ? "var(--on-brand)" : "var(--text-primary)",
        background: active ? "var(--brand-primary)" : "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        cursor: enabled ? "pointer" : "not-allowed",
        opacity: enabled ? 1 : 0.4,
      }}
    >
      {content}
    </button>
  );

  return (
    <div
      className={`sq-pagination ${className}`}
      style={{ display: "inline-flex", borderRadius: "var(--radius-sm)", overflow: "hidden", ...style }}
    >
      {btn("«", page > 1, onPrev, false)}
      {btn(`Page ${page}`, false, undefined, true)}
      {btn("»", hasNext, onNext, false)}
    </div>
  );
}
